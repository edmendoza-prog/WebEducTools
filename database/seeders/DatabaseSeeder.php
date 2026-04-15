<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name' => 'Student User',
                'email' => 'student@webeduc.test',
                'role' => 'student',
            ],
            [
                'name' => 'Teacher User',
                'email' => 'teacher@webeduc.test',
                'role' => 'teacher',
            ],
            [
                'name' => 'Admin User',
                'email' => 'admin@webeduc.test',
                'role' => 'admin',
            ],
        ];

        foreach ($users as $userData) {
            User::updateOrCreate(
                ['email' => $userData['email']],
                [
                    'name' => $userData['name'],
                    'role' => $userData['role'],
                    'password' => 'Password123!',
                ],
            );
        }
    }
}
