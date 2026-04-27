# Admin Interface Setup Guide

## Overview
The admin interface has been successfully created with the following features:
- **Admin Dashboard**: Statistics overview showing total students, teachers, and active users
- **Student Management**: Full CRUD operations for student accounts
- **Teacher Management**: Full CRUD operations for teacher accounts
- **Gamification Panel**: System-wide gamification management (moved from teacher interface)

## File Structure

### Backend
- `app/Http/Middleware/AdminMiddleware.php` - Protects admin routes (requires 'admin' role)
- `app/Http/Controllers/AdminController.php` - User management API (7 methods)
- `bootstrap/app.php` - Registered 'admin' middleware alias
- `routes/web.php` - Admin routes under `/api/admin` prefix with 'admin' middleware

### Frontend
- `resources/js/components/ui/AdminLayout.tsx` - Admin layout with sidebar navigation
- `resources/js/pages/AdminDashboard.tsx` - Dashboard with statistics
- `resources/js/pages/admin/AdminStudents.tsx` - Student CRUD interface
- `resources/js/pages/admin/AdminTeachers.tsx` - Teacher CRUD interface
- `resources/js/pages/admin/AdminGamification.tsx` - Gamification management panel
- `resources/js/app.tsx` - Admin routes configured (Role type includes 'admin')
- `resources/css/app.css` - Admin-specific styles (admin-* prefixed classes)

### Routes
- `/admin-dashboard` - Admin dashboard (protected)
- `/admin-dashboard/students` - Student management (protected)
- `/admin-dashboard/teachers` - Teacher management (protected)
- `/admin-dashboard/gamification` - Gamification panel (protected)

### API Endpoints
All endpoints require authentication and 'admin' role:
- `GET /api/admin/dashboard` - Dashboard statistics
- `GET /api/admin/students` - List students (paginated)
- `GET /api/admin/teachers` - List teachers (paginated)
- `GET /api/admin/users/{id}` - Get single user
- `POST /api/admin/users` - Create user (requires: name, email, password, role)
- `PUT /api/admin/users/{id}` - Update user
- `DELETE /api/admin/users/{id}` - Delete user
- `POST /api/admin/users/bulk-delete` - Bulk delete users
- `GET /api/admin/gamification/*` - Gamification endpoints (moved from teacher)

## Creating an Admin User

Since this is a new system, you need to create the first admin user manually in the database:

### Option 1: Using Laravel Tinker (Recommended)
```bash
php artisan tinker
```

Then run:
```php
$admin = new App\Models\User();
$admin->name = 'Admin User';
$admin->email = 'admin@webeduc.com';
$admin->password = bcrypt('admin123');
$admin->role = 'admin';
$admin->save();
```

### Option 2: Direct Database SQL
```sql
INSERT INTO users (name, email, password, role, created_at, updated_at)
VALUES (
    'Admin User',
    'admin@webeduc.com',
    '$2y$12$YOUR_HASHED_PASSWORD_HERE',
    'admin',
    NOW(),
    NOW()
);
```

To generate a password hash for SQL:
```bash
php artisan tinker
bcrypt('admin123')
```

### Option 3: Update Existing User to Admin
If you already have a teacher or student account:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your.email@example.com';
```

## Testing the Admin Interface

1. **Start the development server**:
   ```bash
   php artisan serve
   ```

2. **Login with admin credentials**:
   - Navigate to `/login` or `/auth`
   - Use the admin email and password you created

3. **Verify admin access**:
   - After login, you should be redirected to `/admin-dashboard`
   - Check that the sidebar shows: Dashboard, Students, Teachers, Gamification
   - Non-admin users attempting to access admin routes will receive 403 Forbidden

4. **Test each section**:
   - **Dashboard**: View statistics for total students, teachers, and active users
   - **Students**: Create, edit, search, and delete student accounts
   - **Teachers**: Create, edit, search, and delete teacher accounts
   - **Gamification**: Configure XP rules, manage badges, view leaderboard, reset scores

## Features

### Student & Teacher Management
- **Search**: Filter by name or email (real-time)
- **Pagination**: 20 users per page with Previous/Next buttons
- **Create**: Modal form with name, email, and password fields
- **Edit**: Update user details (password optional)
- **Delete**: Single user deletion with confirmation (cannot delete own account)
- **Validation**: Email format, password minimum 8 characters

### Dashboard Statistics
- **Total Students**: Count of all student accounts
- **Total Teachers**: Count of all teacher accounts  
- **Total Users**: Combined count
- **Active Users**: Users active in the last 7 days
- **Recent Users**: Lists of recently created students and teachers

### Gamification Panel
- **Metrics Dashboard**: Total XP, Active Students, Engagement Rate, Retention Rate
- **Trend Chart**: Visual representation of events and XP over time
- **Leaderboard**: Top students by XP with rankings
- **Points Rules**: Configure XP rewards for different actions
- **Badge Management**: Create and edit achievement badges
- **Moderation**: Reset individual student gamification scores

## Security

- **Role-Based Access Control**: Only users with `role = 'admin'` can access admin routes
- **Middleware Protection**: `AdminMiddleware` checks user role on every request
- **CSRF Protection**: All state-changing requests use csrfFetch()
- **Self-Protection**: Admins cannot delete their own accounts
- **Authentication Required**: All routes require valid Laravel Sanctum session

## Changes to Existing Code

1. **TeacherLayout.tsx**: Removed "Gamification Panel" link (moved to admin)
2. **app.tsx**: Added 'admin' to Role type, added RoleGate for admin, added admin routes
3. **Role redirects**: Updated to redirect admins to `/admin-dashboard`

## Styling

All admin components use a consistent design system:
- **Color Scheme**: Blue gradients (#3b82f6, #2563eb) with dark sidebar (#1e293b, #0f172a)
- **Typography**: Inter font family, clear hierarchy
- **Spacing**: Consistent 1rem-2rem padding and gaps
- **Components**: Cards, tables, modals, forms with modern shadows and hover states
- **Responsive**: Mobile-friendly with breakpoints at 768px and 1024px

## Notes

- The gamification panel has been **moved entirely to admin** from the teacher interface
- Teachers no longer have access to gamification management
- This is appropriate as gamification rules affect the entire system
- Build output: ~850 KB JS, ~135 KB CSS (consider code-splitting for optimization)

## Troubleshooting

### 403 Forbidden on Admin Routes
- Check that the user's `role` field in the database is set to `'admin'` (not 'teacher' or 'student')
- Verify authentication is working (`/auth/me` should return authenticated: true)
- Check Laravel logs: `storage/logs/laravel.log`

### Sidebar Not Showing
- Clear browser cache and hard refresh (Ctrl+Shift+R)
- Check browser console for JavaScript errors
- Verify npm run build completed successfully

### API Errors
- Check that routes are registered: `php artisan route:list | grep admin`
- Verify middleware is applied: Check `bootstrap/app.php` for admin alias
- Ensure database connection is working

### Redirect Loop
- Clear Laravel session: `php artisan session:flush`
- Clear browser cookies for the application domain
- Check that `/auth/me` returns correct user role
