# Aptitude Booster Club - Blog Platform Specification

## 1. Project Overview

**Project Name:** Aptitude Booster Club
**Type:** Full-stack blogging platform
**Core Functionality:** SEO-friendly blog with content management system, featuring blog creation, categorization, search, and admin panel
**Target Users:** Blog readers, content creators, administrators

## 2. Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Templating:** EJS with express-ejs-layouts
- **UI Framework:** Bootstrap 5
- **JavaScript:** jQuery + SweetAlert2
- **Content Editor:** EditorJS
- **Email:** Nodemailer
- **Security:** Helmet.js, express-validator, xss-sanitizer, csurf

## 3. UI/UX Specification

### Color Palette
- **Primary:** #1D6655 (Teal green)
- **Primary Dark:** #145242
- **Primary Light:** #2A8F7D
- **Secondary:** #F8F9FA (Light gray background)
- **Accent:** #E67E22 (Orange for CTAs)
- **Text Primary:** #212529
- **Text Secondary:** #6C757D
- **Success:** #28A745
- **Error:** #DC3545
- **Warning:** #FFC107

### Typography
- **Headings:** 'Playfair Display', serif
- **Body:** 'Source Sans Pro', sans-serif
- **Code:** 'Fira Code', monospace

### Layout Structure
- **Header:** Fixed navigation with logo, menu, search
- **Hero:** Featured post on homepage (full width)
- **Content:** 8-column main + 4-column sidebar
- **Footer:** Links, newsletter, social icons
- **Responsive:** Mobile-first, breakpoints at 576px, 768px, 992px, 1200px

### Frontend Pages
1. **Homepage:** Featured post, recent posts grid, categories, newsletter
2. **Blog Listing:** Grid/list view, pagination, filters
3. **Single Post:** Full article, author info, related posts, comments section
4. **Category Page:** Filtered posts by category
5. **Tag Page:** Filtered posts by tag
6. **Search Results:** Filtered by search query
7. **About Page:** Static content
8. **Contact Page:** Contact form

### Admin Pages
1. **Login:** Authentication form
2. **Dashboard:** Stats cards, recent posts, quick actions
3. **Posts List:** Table with actions (edit, delete, publish)
4. **Post Editor:** EditorJS with SEO fields
5. **Categories:** CRUD operations
6. **Tags:** CRUD operations
7. **Settings:** Site settings

## 4. Database Schema

### User Model
```
{
  username: String (unique, required)
  email: String (unique, required)
  password: String (hashed)
  role: String (enum: 'admin', 'author')
  avatar: String
  bio: String
  isActive: Boolean
  createdAt: Date
  updatedAt: Date
}
```

### Post Model
```
{
  title: String (required)
  slug: String (unique, required)
  content: Object (EditorJS blocks)
  excerpt: String
  featuredImage: String
  author: ObjectId (ref: User)
  category: ObjectId (ref: Category)
  tags: [ObjectId] (ref: Tag)
  status: String (enum: 'draft', 'published', 'scheduled', 'archived')
  publishedAt: Date
  scheduledAt: Date
  views: Number
  seo: {
    metaTitle: String
    metaDescription: String
    metaKeywords: String
  }
  createdAt: Date
  updatedAt: Date
}
```

### Category Model
```
{
  name: String (required)
  slug: String (unique, required)
  description: String
  image: String
  isActive: Boolean
  createdAt: Date
  updatedAt: Date
}
```

### Tag Model
```
{
  name: String (required)
  slug: String (unique, required)
  createdAt: Date
  updatedAt: Date
}
```

### Setting Model
```
{
  key: String (unique, required)
  value: String/Object
  createdAt: Date
  updatedAt: Date
}
```

## 5. API Endpoints

### Public Routes
- GET / - Homepage
- GET /blog - Blog listing with pagination
- GET /blog/:slug - Single post
- GET /category/:slug - Posts by category
- GET /tag/:slug - Posts by tag
- GET /search - Search results
- GET /about - About page
- GET /contact - Contact page
- POST /contact - Submit contact form

### Admin Routes (Protected)
- GET /admin - Dashboard
- GET /admin/login - Login page
- POST /admin/login - Login action
- GET /admin/logout - Logout action
- GET /admin/posts - Posts list
- GET /admin/posts/new - New post form
- POST /admin/posts - Create post
- GET /admin/posts/:id - Edit post form
- PUT /admin/posts/:id - Update post
- DELETE /admin/posts/:id - Delete post
- GET /admin/categories - Categories list
- POST /admin/categories - Create category
- PUT /admin/categories/:id - Update category
- DELETE /admin/categories/:id - Delete category
- GET /admin/tags - Tags list
- POST /admin/tags - Create tag
- DELETE /admin/tags/:id - Delete tag

### API Endpoints
- GET /api/posts - Get posts (paginated)
- GET /api/categories - Get categories
- GET /api/tags - Get tags
- GET /api/search - Search posts
- POST /api/upload - Image upload

## 6. SEO Features

- Dynamic meta tags per page
- OpenGraph tags
- Twitter Card tags
- JSON-LD structured data
- Clean slug-based URLs
- Sitemap.xml generation
- robots.txt
- Canonical URLs
- Alt text for images

## 7. Email System

- Welcome email on admin creation
- Email notification on new post publication
- Contact form submission notification
- Use Nodemailer with configurable SMTP

## 8. Security Features

- Helmet.js for HTTP headers
- express-validator for input validation
- xss-sanitizer for XSS prevention
- CSRF protection
- Session-based authentication
- Password hashing with bcrypt
- Rate limiting
- Input sanitization

## 9. Performance

- MongoDB indexing on slug, status, createdAt
- Text index on title, content, excerpt
- Lazy loading images
- Caching headers
- Compression middleware
- Static asset optimization

## 10. Acceptance Criteria

1. Homepage loads with featured post and recent posts
2. Blog listing shows paginated posts with filters
3. Single post displays full content with related posts
4. Category and tag pages filter posts correctly
5. Search returns relevant results
6. Admin can create, edit, delete posts
7. Admin can manage categories and tags
8. SEO meta tags render correctly
9. Sitemap.xml is accessible
10. Email sends on post publication
11. All forms have validation
12. Application is responsive
13. Admin panel is secure and accessible only to authenticated users
