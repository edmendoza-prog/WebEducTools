<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LearningHubController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
	Route::post('/register', [AuthController::class, 'register']);
	Route::post('/login', [AuthController::class, 'login']);
	Route::middleware('auth:sanctum')->group(function () {
		Route::get('/me', [AuthController::class, 'me']);
		Route::patch('/profile', [AuthController::class, 'updateProfile']);
		Route::post('/logout', [AuthController::class, 'logout']);
	});
});

Route::get('/login', function () {
	return view('app');
});

Route::get('/login/admin', function () {
	return view('app');
});

Route::get('/signup', function () {
	return view('app');
});

Route::get('/csrf-token', function () {
	session()->regenerateToken();

	return response()->json([
		'token' => csrf_token(),
	]);
});

Route::prefix('api')->middleware('auth:sanctum')->group(function () {
	Route::prefix('teacher')->group(function () {
		Route::get('/dashboard', [LearningHubController::class, 'teacherDashboard']);
		Route::get('/notifications', [LearningHubController::class, 'teacherNotifications']);
		Route::patch('/notifications/{notificationId}/read', [LearningHubController::class, 'markNotification']);
		Route::post('/notifications/announcement', [LearningHubController::class, 'sendAnnouncement']);
		Route::post('/generate-content', [LearningHubController::class, 'generateContent']);
		Route::post('/study-sets', [LearningHubController::class, 'createStudySet']);
		Route::put('/study-sets/{studySetId}', [LearningHubController::class, 'updateStudySet']);
		Route::delete('/study-sets/{studySetId}', [LearningHubController::class, 'deleteStudySet']);
		Route::post('/study-sets/{studySetId}/assign', [LearningHubController::class, 'assignStudySet']);
		Route::get('/study-guides', [LearningHubController::class, 'listStudyGuides']);
		Route::post('/study-guides', [LearningHubController::class, 'createStudyGuide']);
		Route::delete('/study-guides/{guideId}', [LearningHubController::class, 'deleteStudyGuide']);
		Route::post('/assignments', [LearningHubController::class, 'createAssignment']);
		Route::get('/assignments', [LearningHubController::class, 'listAssignments']);
		Route::get('/reports', [LearningHubController::class, 'teacherReports']);
		Route::post('/achievements/award', [LearningHubController::class, 'awardBadge']);
		
		// Practice Tests
		Route::get('/practice-tests', [App\Http\Controllers\PracticeTestController::class, 'index']);
		Route::post('/practice-tests', [App\Http\Controllers\PracticeTestController::class, 'store']);
		Route::get('/practice-tests/{id}', [App\Http\Controllers\PracticeTestController::class, 'show']);
		Route::put('/practice-tests/{id}', [App\Http\Controllers\PracticeTestController::class, 'update']);
		Route::delete('/practice-tests/{id}', [App\Http\Controllers\PracticeTestController::class, 'destroy']);
		Route::post('/practice-tests/generate-questions', [App\Http\Controllers\PracticeTestController::class, 'generateQuestions']);
	});

	Route::post('/classes', [LearningHubController::class, 'createClass']);
	Route::get('/classes', [LearningHubController::class, 'listClasses']);
	Route::put('/classes/{classId}', [LearningHubController::class, 'updateClass']);
	Route::delete('/classes/{classId}', [LearningHubController::class, 'deleteClass']);
	Route::post('/classes/{classId}/students', [LearningHubController::class, 'addClassStudent']);
	Route::delete('/classes/{classId}/students/{studentId}', [LearningHubController::class, 'removeClassStudent']);

	Route::prefix('admin')->middleware('admin')->group(function () {
		// Dashboard
		Route::get('/dashboard', [App\Http\Controllers\AdminController::class, 'dashboard']);
		
		// User Management
		Route::get('/students', [App\Http\Controllers\AdminController::class, 'getStudents']);
		Route::get('/teachers', [App\Http\Controllers\AdminController::class, 'getTeachers']);
		Route::get('/users/{id}', [App\Http\Controllers\AdminController::class, 'getUser']);
		Route::post('/users', [App\Http\Controllers\AdminController::class, 'createUser']);
		Route::put('/users/{id}', [App\Http\Controllers\AdminController::class, 'updateUser']);
		Route::delete('/users/{id}', [App\Http\Controllers\AdminController::class, 'deleteUser']);
		Route::post('/users/bulk-delete', [App\Http\Controllers\AdminController::class, 'bulkDeleteUsers']);
		
		// Gamification Management
		Route::get('/gamification/dashboard', [LearningHubController::class, 'adminGamificationDashboard']);
		Route::get('/badges', [LearningHubController::class, 'adminBadges']);
		Route::post('/badges', [LearningHubController::class, 'createAdminBadge']);
		Route::patch('/badges/{badgeId}', [LearningHubController::class, 'updateAdminBadge']);
		Route::post('/gamification/rules', [LearningHubController::class, 'updateGamificationRules']);
		Route::post('/gamification/reset-user', [LearningHubController::class, 'resetGamificationUser']);
	});

	Route::prefix('gamification')->group(function () {
		Route::get('/me', [LearningHubController::class, 'gamificationMe']);
		Route::get('/leaderboard', [LearningHubController::class, 'gamificationLeaderboard']);
		Route::get('/badges', [LearningHubController::class, 'gamificationBadges']);
		Route::post('/earn-xp', [LearningHubController::class, 'gamificationEarnXp']);
	});

	Route::prefix('student')->group(function () {
		Route::get('/dashboard', [LearningHubController::class, 'studentDashboard']);
		Route::get('/activities', [LearningHubController::class, 'studentActivities']);
		Route::get('/activities/debug', [LearningHubController::class, 'debugStudentActivities']);
		Route::get('/activities/{activityId}', [LearningHubController::class, 'getActivityDetails']);
		Route::get('/flashcards', [LearningHubController::class, 'studentFlashcards']);
		Route::get('/quiz/questions', [LearningHubController::class, 'studentQuizQuestions']);
		Route::post('/quiz/submit', [LearningHubController::class, 'submitQuiz']);
		Route::post('/flashcards/progress', [LearningHubController::class, 'saveFlashcardProgress']);
		Route::get('/achievements', [LearningHubController::class, 'studentAchievements']);
		Route::get('/notifications', [LearningHubController::class, 'studentNotifications']);
		Route::patch('/notifications/read-all', [LearningHubController::class, 'markStudentNotificationsRead']);
		Route::delete('/notifications/{notificationId}', [LearningHubController::class, 'deleteStudentNotification']);
		Route::get('/class-materials', [LearningHubController::class, 'studentClassMaterials']);
		Route::get('/class-members', [LearningHubController::class, 'studentClassMembers']);

		// Practice Tests
		Route::get('/practice-tests', [App\Http\Controllers\PracticeTestController::class, 'studentIndex']);
		Route::get('/practice-tests/{id}', [App\Http\Controllers\PracticeTestController::class, 'getTest']);
		Route::post('/practice-tests/{id}/submit', [App\Http\Controllers\PracticeTestController::class, 'submitTest']);
		Route::get('/practice-tests/{id}/results', [App\Http\Controllers\PracticeTestController::class, 'getResults']);
	});
});

Route::view('/{path?}', 'app')->where('path', '.*');

