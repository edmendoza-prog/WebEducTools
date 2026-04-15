<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('user_points')) {
            Schema::create('user_points', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('xp')->default(0);
                $table->unsignedInteger('level')->default(1);
                $table->string('title')->default('Beginner');
                $table->unsignedInteger('total_points')->default(0);
                $table->date('last_daily_login_at')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('badges')) {
            Schema::create('badges', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('requirement_type');
                $table->unsignedInteger('requirement_value')->default(1);
                $table->unsignedInteger('xp_reward')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('user_badges')) {
            Schema::create('user_badges', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('badge_id')->constrained('badges')->cascadeOnDelete();
                $table->unsignedInteger('progress')->default(0);
                $table->timestamp('date_earned')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'badge_id']);
            });
        }

        if (! Schema::hasTable('streaks')) {
            Schema::create('streaks', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('streak_count')->default(0);
                $table->unsignedInteger('best_streak')->default(0);
                $table->date('last_activity_date')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('leaderboard')) {
            Schema::create('leaderboard', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->unsignedInteger('score')->default(0);
                $table->unsignedInteger('rank')->default(0);
                $table->string('scope')->default('global');
                $table->string('week_key')->nullable();
                $table->timestamps();
                $table->unique(['user_id', 'scope', 'week_key']);
            });
        }

        if (! Schema::hasTable('gamification_rules')) {
            Schema::create('gamification_rules', function (Blueprint $table) {
                $table->id();
                $table->string('rule_key')->unique();
                $table->integer('rule_value')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('gamification_events')) {
            Schema::create('gamification_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->string('source');
                $table->integer('xp_delta')->default(0);
                $table->json('meta')->nullable();
                $table->timestamps();
                $table->index(['user_id', 'created_at']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('gamification_events');
        Schema::dropIfExists('gamification_rules');
        Schema::dropIfExists('leaderboard');
        Schema::dropIfExists('streaks');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('user_points');
    }
};
