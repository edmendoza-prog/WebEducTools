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
        Schema::table('study_guides', function (Blueprint $table) {
            $table->string('visibility')->default('public')->after('subject');
            $table->string('upload_type')->default('text')->after('visibility');
            $table->string('file_path')->nullable()->after('upload_type');
            $table->foreignId('class_id')->nullable()->after('teacher_id')->constrained('classes')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('study_guides', function (Blueprint $table) {
            $table->dropColumn(['visibility', 'upload_type', 'file_path', 'class_id']);
        });
    }
};
