-- CreateTable
CREATE TABLE "CompletedWorkoutExercises" (
    "id" TEXT NOT NULL,
    "workoutExerciseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompletedWorkoutExercises_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CompletedWorkoutExercises" ADD CONSTRAINT "CompletedWorkoutExercises_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletedWorkoutExercises" ADD CONSTRAINT "CompletedWorkoutExercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
