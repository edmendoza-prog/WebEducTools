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
        Schema::create('practice_tests', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('teacher_id');
            $table->string('title');
            $table->string('subject');
            $table->string('class_name')->nullable();
            $table->integer('duration'); // in minutes
            $table->text('instructions')->nullable();
            $table->timestamps();

            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
            $table->index('teacher_id');
        });

        Schema::create('practice_test_questions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('practice_test_id');
            $table->enum('question_type', ['multiple_choice', 'true_false', 'identification']);
            $table->text('question_text');
            $table->json('options')->nullable(); // For multiple choice options
            $table->json('correct_answer'); // Stores answer based on question type
            $table->integer('points')->default(1);
            $table->integer('order_number')->default(0);
            $table->timestamps();

            $table->foreign('practice_test_id')->references('id')->on('practice_tests')->onDelete('cascade');
            $table->index('practice_test_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('practice_test_questions');
        Schema::dropIfExists('practice_tests');
    }
};
