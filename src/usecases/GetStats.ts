import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { WeekDay } from "../generated/prisma/enums.js";
import { prisma } from "../lib/db.js";

dayjs.extend(utc);

const DAY_INDEX_TO_WEEKDAY: Record<number, WeekDay> = {
  0: WeekDay.SUNDAY,
  1: WeekDay.MONDAY,
  2: WeekDay.TUESDAY,
  3: WeekDay.WEDNESDAY,
  4: WeekDay.THURSDAY,
  5: WeekDay.FRIDAY,
  6: WeekDay.SATURDAY,
};

interface InputDto {
  userId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}

interface ConsistencyDayDto {
  workoutDayCompleted: boolean;
  workoutDayStarted: boolean;
}

interface OutputDto {
  workoutStreak: number;
  consistencyByDay: Record<string, ConsistencyDayDto>;
  completedWorkoutsCount: number;
  conclusionRate: number;
  totalTimeInSeconds: number;
}

export class GetStats {
  async execute(dto: InputDto): Promise<OutputDto> {
    const from = dayjs.utc(dto.from).startOf("day");
    const to = dayjs.utc(dto.to).endOf("day");

    // 1. Fetch all workout sessions in the range for this user
    const sessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: from.toDate(),
          lte: to.toDate(),
        },
      },
    });

    // 2. Group sessions by date and build consistencyByDay (only days with sessions)
    const sessionsByDate = new Map<
      string,
      { started: boolean; completed: boolean }
    >();
    for (const session of sessions) {
      const sessionDate = dayjs.utc(session.startedAt).format("YYYY-MM-DD");
      const existing = sessionsByDate.get(sessionDate) ?? {
        started: false,
        completed: false,
      };
      existing.started = true;
      if (session.completedAt) {
        existing.completed = true;
      }
      sessionsByDate.set(sessionDate, existing);
    }

    const consistencyByDay: Record<string, ConsistencyDayDto> = {};
    for (const [date, data] of sessionsByDate) {
      consistencyByDay[date] = {
        workoutDayCompleted: data.completed,
        workoutDayStarted: data.started,
      };
    }

    // 3. Calculate completedWorkoutsCount
    const completedWorkoutsCount = sessions.filter(
      (s) => s.completedAt !== null,
    ).length;

    // 4. Calculate conclusionRate
    const conclusionRate =
      sessions.length > 0 ? completedWorkoutsCount / sessions.length : 0;

    // 5. Calculate totalTimeInSeconds
    let totalTimeInSeconds = 0;
    for (const session of sessions) {
      if (session.completedAt) {
        const start = dayjs.utc(session.startedAt);
        const end = dayjs.utc(session.completedAt);
        totalTimeInSeconds += end.diff(start, "second");
      }
    }

    // 6. Calculate workout streak
    const workoutStreak = await this.calculateStreak(
      dto.userId,
      dayjs.utc(dto.to),
    );

    return {
      workoutStreak,
      consistencyByDay,
      completedWorkoutsCount,
      conclusionRate,
      totalTimeInSeconds,
    };
  }

  private async calculateStreak(
    userId: string,
    currentDate: dayjs.Dayjs,
  ): Promise<number> {
    // Get the active workout plan to know which days are workout days
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          select: { weekDay: true, isRest: true },
        },
      },
    });

    if (!activeWorkoutPlan) {
      return 0;
    }

    const weekDayMap = new Map<WeekDay, boolean>();
    for (const day of activeWorkoutPlan.workoutDays) {
      weekDayMap.set(day.weekDay, day.isRest);
    }

    // Fetch completed sessions within a lookback window
    const lookbackDate = currentDate
      .subtract(365, "day")
      .startOf("day")
      .toDate();
    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: { userId },
        },
        startedAt: { gte: lookbackDate },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    const completedDates = new Set<string>();
    for (const session of completedSessions) {
      completedDates.add(dayjs.utc(session.startedAt).format("YYYY-MM-DD"));
    }

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = currentDate.subtract(i, "day");
      const weekDay = DAY_INDEX_TO_WEEKDAY[checkDate.day()];

      if (!weekDayMap.has(weekDay)) {
        continue;
      }

      const isRest = weekDayMap.get(weekDay)!;

      if (isRest) {
        streak++;
        continue;
      }

      const dateStr = checkDate.format("YYYY-MM-DD");
      if (completedDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }
}
