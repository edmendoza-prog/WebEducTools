<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('practice_test_attempts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('practice_test_id');
            $table->unsignedBigInteger('student_id');
            $table->json('answers'); // Student's answers keyed by question ID
            $table->integer('correct_count')->default(0);
            $table->integer('total_questions')->default(0);
            $table->decimal('earned_points', 8, 2)->default(0);
            $table->decimal('total_points', 8, 2)->default(0);
            $table->decimal('score_percentage', 5, 2)->default(0);
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // Foreign keys
            $table->foreign('practice_test_id')->references('id')->on('practice_tests')->onDelete('cascade');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');

            // Index for fast lookups
            $table->index(['practice_test_id', 'student_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('practice_test_attempts');
    }
};
