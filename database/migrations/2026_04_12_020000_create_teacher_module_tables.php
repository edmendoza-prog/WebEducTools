<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('classes')) {
            Schema::create('classes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
                $table->string('name');
                $table->string('subject');
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('class_students')) {
            Schema::create('class_students', function (Blueprint $table) {
                $table->id();
                $table->foreignId('class_id')->constrained('classes')->cascadeOnDelete();
                $table->foreignId('student_id')->constrained('users')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['class_id', 'student_id']);
            });
        }

        if (! Schema::hasTable('study_guides')) {
            Schema::create('study_guides', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
                $table->string('title');
                $table->text('content');
                $table->string('image_url')->nullable();
                $table->string('subject')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('assignments')) {
            Schema::create('assignments', function (Blueprint $table) {
                $table->id();
                $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('class_id')->nullable()->constrained('classes')->nullOnDelete();
                $table->enum('material_type', ['study_guide', 'study_set', 'quiz']);
                $table->unsignedBigInteger('material_id');
                $table->timestamp('deadline_at')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
                $table->index(['material_type', 'material_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
        Schema::dropIfExists('study_guides');
        Schema::dropIfExists('class_students');
        Schema::dropIfExists('classes');
    }
};
