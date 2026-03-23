<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
	Route::post('/register', [AuthController::class, 'register']);
	Route::post('/login', [AuthController::class, 'login']);
	Route::get('/me', [AuthController::class, 'me']);
	Route::post('/logout', [AuthController::class, 'logout']);
});

Route::get('/csrf-token', function () {
	session()->regenerateToken();

	return response()->json([
		'token' => csrf_token(),
	]);
});

Route::view('/{path?}', 'app')->where('path', '.*');

