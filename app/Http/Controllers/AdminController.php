<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    /**
     * Get admin dashboard statistics
     */
    public function dashboard(): JsonResponse
    {
        try {
            $totalStudents = User::where('role', 'student')->count();
            $totalTeachers = User::where('role', 'teacher')->count();
            $totalUsers = User::count();
            
            $recentStudents = User::where('role', 'student')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(['id', 'name', 'email', 'created_at']);
                
            $recentTeachers = User::where('role', 'teacher')
                ->orderBy('created_at', 'desc')
                ->take(5)
                ->get(['id', 'name', 'email', 'created_at']);

            return response()->json([
                'stats' => [
                    'totalStudents' => $totalStudents,
                    'totalTeachers' => $totalTeachers,
                    'totalUsers' => $totalUsers,
                    'activeUsers' => User::whereDate('updated_at', '>=', now()->subDays(7))->count(),
                ],
                'recentStudents' => $recentStudents,
                'recentTeachers' => $recentTeachers,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch dashboard data'], 500);
        }
    }

    /**
     * Get all students with pagination and search
     */
    public function getStudents(Request $request): JsonResponse
    {
        try {
            $query = User::where('role', 'student');
            
            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }
            
            $perPage = $request->input('per_page', 20);
            $students = $query->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'students' => $students->items(),
                'total' => $students->total(),
                'current_page' => $students->currentPage(),
                'per_page' => $students->perPage(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch students'], 500);
        }
    }

    /**
     * Get all teachers with pagination and search
     */
    public function getTeachers(Request $request): JsonResponse
    {
        try {
            $query = User::where('role', 'teacher');
            
            // Search
            if ($request->has('search')) {
                $search = $request->input('search');
                $query->where(function($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }
            
            $perPage = $request->input('per_page', 20);
            $teachers = $query->orderBy('created_at', 'desc')
                ->paginate($perPage);

            return response()->json([
                'teachers' => $teachers->items(),
                'total' => $teachers->total(),
                'current_page' => $teachers->currentPage(),
                'per_page' => $teachers->perPage(),
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to fetch teachers'], 500);
        }
    }

    /**
     * Get a single user by ID
     */
    public function getUser($id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            return response()->json($user);
        } catch (\Exception $e) {
            return response()->json(['error' => 'User not found'], 404);
        }
    }

    /**
     * Create a new user (student or teacher)
     */
    public function createUser(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => ['required', Rule::in(['student', 'teacher'])],
        ]);

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            return response()->json([
                'message' => 'User created successfully',
                'user' => $user,
            ], 201);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to create user'], 500);
        }
    }

    /**
     * Update a user
     */
    public function updateUser(Request $request, $id): JsonResponse
    {
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|string|email|max:255|unique:users,email,' . $id,
            'password' => 'sometimes|nullable|string|min:8',
            'role' => ['sometimes', 'required', Rule::in(['student', 'teacher'])],
        ]);

        try {
            $user = User::findOrFail($id);
            
            $data = $request->only(['name', 'email', 'role']);
            
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $user->update($data);

            return response()->json([
                'message' => 'User updated successfully',
                'user' => $user,
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to update user'], 500);
        }
    }

    /**
     * Delete a user
     */
    public function deleteUser($id): JsonResponse
    {
        try {
            $user = User::findOrFail($id);
            
            // Prevent deleting the current admin
            if ($user->id === auth()->id()) {
                return response()->json(['error' => 'Cannot delete your own account'], 400);
            }

            $user->delete();

            return response()->json(['message' => 'User deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete user'], 500);
        }
    }

    /**
     * Bulk delete users
     */
    public function bulkDeleteUsers(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'required|integer|exists:users,id',
        ]);

        try {
            $currentUserId = auth()->id();
            $ids = array_filter($request->ids, fn($id) => $id != $currentUserId);
            
            User::whereIn('id', $ids)->delete();

            return response()->json(['message' => 'Users deleted successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => 'Failed to delete users'], 500);
        }
    }
}
