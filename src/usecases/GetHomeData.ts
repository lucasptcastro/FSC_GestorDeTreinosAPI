import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";

import { NotFoundError } from "../errors/index.js";
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
  date: string; // YYYY-MM-DD
}

interface TodayWorkoutDayDto {
  workoutPlanId: string;
  id: string;
  name: string;
  isRest: boolean;
  weekDay: WeekDay;
  estimatedDurationInSeconds: number;
  coverImageUrl?: string;
  exercisesCount: number;
}

interface ConsistencyDayDto {
  workoutDayCompleted: boolean;
  workoutDayStarted: boolean;
}

interface OutputDto {
  activeWorkoutPlanId: string;
  todayWorkoutDay: TodayWorkoutDayDto | null;
  workoutStreak: number;
  consistencyByDay: Record<string, ConsistencyDayDto>;
}

export class GetHomeData {
  async execute(dto: InputDto): Promise<OutputDto> {
    const date = dayjs.utc(dto.date);

    // 1. Find active workout plan
    const activeWorkoutPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dto.userId,
        isActive: true,
      },
      include: {
        workoutDays: {
          include: {
            exercises: true,
          },
        },
      },
    });

    if (!activeWorkoutPlan) {
      throw new NotFoundError("Active workout plan not found");
    }

    // 2. Find today's workout day
    const todayWeekDay = DAY_INDEX_TO_WEEKDAY[date.day()];
    const todayWorkoutDay = activeWorkoutPlan.workoutDays.find(
      (day) => day.weekDay === todayWeekDay,
    );

    // 3. Calculate week range (Sunday 00:00:00 to Saturday 23:59:59 UTC)
    const weekStart = date.day(0).startOf("day");
    const weekEnd = date.day(6).endOf("day");

    // 4. Fetch all workout sessions in the week range for this user
    const weekSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId: dto.userId,
          },
        },
        startedAt: {
          gte: weekStart.toDate(),
          lte: weekEnd.toDate(),
        },
      },
    });

    // 5. Group sessions by date (YYYY-MM-DD)
    const sessionsByDate = new Map<
      string,
      { started: boolean; completed: boolean }
    >();
    for (const session of weekSessions) {
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

    // 6. Build consistencyByDay for all days of the week
    const consistencyByDay: Record<string, ConsistencyDayDto> = {};
    for (let i = 0; i < 7; i++) {
      const dayDate = weekStart.add(i, "day").format("YYYY-MM-DD");
      const sessionData = sessionsByDate.get(dayDate);
      consistencyByDay[dayDate] = {
        workoutDayCompleted: sessionData?.completed ?? false,
        workoutDayStarted: sessionData?.started ?? false,
      };
    }

    // 7. Calculate workout streak
    const workoutStreak = await this.calculateStreak(
      dto.userId,
      date,
      activeWorkoutPlan.workoutDays,
    );

    // 8. Build response
    return {
      activeWorkoutPlanId: activeWorkoutPlan.id,
      todayWorkoutDay: todayWorkoutDay
        ? {
            workoutPlanId: activeWorkoutPlan.id,
            id: todayWorkoutDay.id,
            name: todayWorkoutDay.name,
            isRest: todayWorkoutDay.isRest,
            weekDay: todayWorkoutDay.weekDay,
            estimatedDurationInSeconds:
              todayWorkoutDay.estimatedDurationInSeconds,
            coverImageUrl: todayWorkoutDay.coverImageUrl ?? undefined,
            exercisesCount: todayWorkoutDay.exercises.length,
          }
        : null,
      workoutStreak,
      consistencyByDay,
    };
  }

  private async calculateStreak(
    userId: string,
    currentDate: dayjs.Dayjs,
    workoutDays: Array<{ weekDay: WeekDay; isRest: boolean }>,
  ): Promise<number> {
    const weekDayMap = new Map<WeekDay, boolean>();
    for (const day of workoutDays) {
      weekDayMap.set(day.weekDay, day.isRest);
    }

    // Fetch all completed sessions within a lookback window
    const lookbackDate = currentDate
      .subtract(365, "day")
      .startOf("day")
      .toDate();
    const completedSessions = await prisma.workoutSession.findMany({
      where: {
        workoutDay: {
          workoutPlan: {
            userId,
          },
        },
        startedAt: { gte: lookbackDate },
        completedAt: { not: null },
      },
      select: { startedAt: true },
    });

    // Create a set of dates with completed sessions
    const completedDates = new Set<string>();
    for (const session of completedSessions) {
      completedDates.add(dayjs.utc(session.startedAt).format("YYYY-MM-DD"));
    }

    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const checkDate = currentDate.subtract(i, "day");
      const weekDay = DAY_INDEX_TO_WEEKDAY[checkDate.day()];

      // Skip days that don't have a workout day in the plan
      if (!weekDayMap.has(weekDay)) {
        continue;
      }

      const isRest = weekDayMap.get(weekDay)!;

      if (isRest) {
        // Rest days count as completed
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
