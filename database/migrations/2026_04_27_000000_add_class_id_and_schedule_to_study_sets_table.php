<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('study_sets', function (Blueprint $table) {
            $table->foreignId('class_id')->nullable()->after('class_name')->constrained('classes')->nullOnDelete();
            $table->timestamp('schedule')->nullable()->after('is_published');
        });
    }

    public function down(): void
    {
        Schema::table('study_sets', function (Blueprint $table) {
            $table->dropForeign(['class_id']);
            $table->dropColumn('class_id');
            $table->dropColumn('schedule');
        });
    }
};
