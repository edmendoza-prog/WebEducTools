<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('study_sets')) {
            Schema::create('study_sets', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->string('subject')->nullable();
                $table->string('class_name')->nullable();
                $table->enum('visibility', ['public', 'private'])->default('private');
                $table->unsignedInteger('cards_count')->default(0);
                $table->boolean('is_published')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('study_set_assignments')) {
            Schema::create('study_set_assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('study_set_id')->constrained('study_sets')->cascadeOnDelete();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('assigned_by')->nullable()->constrained('users')->nullOnDelete();
                $table->enum('assignment_scope', ['individual', 'class'])->default('individual');
                $table->timestamp('assigned_at')->nullable();
                $table->timestamps();
                $table->unique(['study_set_id', 'student_id']);
            });
        }

        if (! Schema::hasTable('flashcards')) {
            Schema::create('flashcards', function (Blueprint $table) {
                $table->id();
                $table->foreignId('study_set_id')->constrained('study_sets')->cascadeOnDelete();
                $table->string('term');
                $table->text('definition');
                $table->string('image_url')->nullable();
                $table->unsignedTinyInteger('difficulty')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('quizzes')) {
            Schema::create('quizzes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('study_set_id')->constrained('study_sets')->cascadeOnDelete();
                $table->string('title');
                $table->string('quiz_type')->default('mixed');
                $table->unsignedInteger('time_limit_minutes')->default(20);
                $table->unsignedTinyInteger('pass_score')->default(75);
                $table->boolean('is_practice_test')->default(false);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('quiz_questions')) {
            Schema::create('quiz_questions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
                $table->enum('question_type', ['multiple_choice', 'true_false', 'identification']);
                $table->text('prompt');
                $table->json('choices')->nullable();
                $table->string('correct_answer');
                $table->text('explanation')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('quiz_attempts')) {
            Schema::create('quiz_attempts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('quiz_id')->constrained('quizzes')->cascadeOnDelete();
                $table->foreignId('study_set_id')->nullable()->constrained('study_sets')->nullOnDelete();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedTinyInteger('score')->default(0);
                $table->json('answers')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('student_progress')) {
            Schema::create('student_progress', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('study_set_id')->constrained('study_sets')->cascadeOnDelete();
                $table->unsignedTinyInteger('completion_rate')->default(0);
                $table->unsignedTinyInteger('last_score')->nullable();
                $table->unsignedInteger('study_minutes')->default(0);
                $table->unsignedInteger('streak_days')->default(0);
                $table->string('weak_area')->nullable();
                $table->timestamp('last_studied_at')->nullable();
                $table->timestamps();
                $table->unique(['student_id', 'study_set_id']);
            });
        }

        if (! Schema::hasTable('achievements')) {
            Schema::create('achievements', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->text('description')->nullable();
                $table->unsignedInteger('target_value')->default(1);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('student_achievements')) {
            Schema::create('student_achievements', function (Blueprint $table) {
                $table->id();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('achievement_id')->constrained('achievements')->cascadeOnDelete();
                $table->foreignId('awarded_by')->nullable()->constrained('users')->nullOnDelete();
                $table->unsignedInteger('progress')->default(0);
                $table->timestamp('awarded_at')->nullable();
                $table->timestamps();
                $table->unique(['student_id', 'achievement_id']);
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type');
                $table->string('title');
                $table->text('message');
                $table->json('payload')->nullable();
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('student_achievements');
        Schema::dropIfExists('achievements');
        Schema::dropIfExists('student_progress');
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('quiz_questions');
        Schema::dropIfExists('quizzes');
        Schema::dropIfExists('flashcards');
        Schema::dropIfExists('study_set_assignments');
        Schema::dropIfExists('study_sets');
    }
};
