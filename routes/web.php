<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\LearningHubController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
	Route::post('/register', [AuthController::class, 'register']);
	Route::post('/login', [AuthController::class, 'login']);
	Route::middleware('auth:sanctum')->group(function () {
		Route::get('/me', [AuthController::class, 'me']);
		Route::post('/logout', [AuthController::class, 'logout']);
	});
});

Route::get('/login', function () {
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
		Route::post('/study-sets', [LearningHubController::class, 'createStudySet']);
		Route::post('/study-sets/{studySetId}/assign', [LearningHubController::class, 'assignStudySet']);
		Route::get('/study-guides', [LearningHubController::class, 'listStudyGuides']);
		Route::post('/study-guides', [LearningHubController::class, 'createStudyGuide']);
		Route::delete('/study-guides/{guideId}', [LearningHubController::class, 'deleteStudyGuide']);
		Route::post('/assignments', [LearningHubController::class, 'createAssignment']);
		Route::get('/assignments', [LearningHubController::class, 'listAssignments']);
		Route::get('/reports', [LearningHubController::class, 'teacherReports']);
		Route::post('/achievements/award', [LearningHubController::class, 'awardBadge']);
	});

	Route::post('/classes', [LearningHubController::class, 'createClass']);
	Route::get('/classes', [LearningHubController::class, 'listClasses']);
	Route::post('/classes/{classId}/students', [LearningHubController::class, 'addClassStudent']);
	Route::delete('/classes/{classId}/students/{studentId}', [LearningHubController::class, 'removeClassStudent']);

	Route::prefix('admin')->group(function () {
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
		Route::get('/flashcards', [LearningHubController::class, 'studentFlashcards']);
		Route::get('/quiz/questions', [LearningHubController::class, 'studentQuizQuestions']);
		Route::post('/quiz/submit', [LearningHubController::class, 'submitQuiz']);
		Route::post('/flashcards/progress', [LearningHubController::class, 'saveFlashcardProgress']);
		Route::get('/achievements', [LearningHubController::class, 'studentAchievements']);
		Route::get('/notifications', [LearningHubController::class, 'studentNotifications']);
	});
});

Route::view('/{path?}', 'app')->where('path', '.*');

