<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('study_sets', function (Blueprint $table) {
            if (! Schema::hasColumn('study_sets', 'teacher_text')) {
                $table->text('teacher_text')->nullable()->after('description');
            }

            if (! Schema::hasColumn('study_sets', 'pdf_file_path')) {
                $table->string('pdf_file_path')->nullable()->after('visibility');
            }

            if (! Schema::hasColumn('study_sets', 'powerpoint_file_path')) {
                $table->string('powerpoint_file_path')->nullable()->after('pdf_file_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('study_sets', function (Blueprint $table) {
            if (Schema::hasColumn('study_sets', 'powerpoint_file_path')) {
                $table->dropColumn('powerpoint_file_path');
            }

            if (Schema::hasColumn('study_sets', 'pdf_file_path')) {
                $table->dropColumn('pdf_file_path');
            }

            if (Schema::hasColumn('study_sets', 'teacher_text')) {
                $table->dropColumn('teacher_text');
            }
        });
    }
};
