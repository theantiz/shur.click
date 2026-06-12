# shur.click Backend

Spring Boot URL shortener service powering [shur.click](https://shur.click).

## Tech Stack

- **Framework**: Spring Boot 3.2.5
- **Language**: Java 17
- **Database**: PostgreSQL (JPA/Hibernate)
- **Cache**: Redis (optional)
- **Authentication**: JWT + Google OAuth
- **Billing**: Razorpay
- **Email**: Resend API

## Project Structure

```
src/main/java/xyz/antiz/urlShorter/
├── UrlShorterApplication.java     # Main entry point
├── config/                       # Configuration classes
├── controller/                  # REST controllers
│   ├── auth/                     # Authentication endpoints
│   ├── BillingController.java   # Payment integration
│   ├── FeedbackController.java  # User feedback
│   ├── HealthController.java    # Health checks
│   └── PublicUrlController.java  # URL operations
├── dto/                         # Data transfer objects
│   ├── auth/
│   ├── billing/
│   ├── profile/
│   └── *.java
├── entity/                       # JPA entities
│   ├── User.java
│   ├── ShortUrl.java
│   ├── UrlClickEvent.java
│   ├── AuthOtpChallenge.java
│   ├── PasswordResetToken.java
│   └── PlanTier.java
├── rate/                        # Rate limiting
├── repo/                        # JPA repositories
├── security/                   # JWT & security config
├── service/                    # Business logic
│   └── auth/
└── util/                       # Utilities
```

## API Endpoints

### Authentication (`/api/auth`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register-init` | Start registration (send OTP) |
| POST | `/api/auth/register-verify` | Complete registration |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/forgot-password` | Initiate password reset |
| POST | `/api/auth/forgot-password-verify` | Verify reset OTP |
| POST | `/api/auth/reset-password` | Set new password |
| POST | `/api/auth/google` | Google OAuth login |

### User Profile (`/api`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Get current user |
| PUT | `/api/me` | Update profile |
| PUT | `/api/me/password` | Change password |

### URLs (`/api/urls`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/urls` | Create short URL |
| GET | `/api/urls` | List user's URLs |
| GET | `/api/urls/{id}` | Get URL details |
| GET | `/api/urls/{id}/stats` | Get click stats |
| DELETE | `/api/urls/{id}` | Delete URL |
| GET | `/api/urls/{alias}` | Redirect to original |

### Billing (`/api/billing`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/billing/status` | Get subscription status |
| POST | `/api/billing/create-order` | Create Razorpay order |
| POST | `/api/billing/verify` | Verify payment |

### Other
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/feedback` | Submit feedback |

## Configuration

Configure via environment variables:

```bash
# Database
JDBC_DATABASE_URL=jdbc:postgresql://host:5432/db
JDBC_DATABASE_USERNAME=user
JDBC_DATABASE_PASSWORD=pass

# JWT (required - generate a secure 256+ bit key)
JWT_SECRET=your-secret-key
JWT_EXP_MINUTES=10080

# App
APP_PUBLIC_BASE_URL=https://shur.click

# Redis (optional)
REDIS_ENABLED=false
REDIS_HOST=localhost
REDIS_PORT=6379

# Billing
RAZORPAY_KEY_ID=your-key-id
RAZORPAY_KEY_SECRET=your-key-secret

# Email
RESEND_API_KEY=re_xxxxxx
MAIL_FROM=noreply@shur.click

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-client-id
```

## Development

```bash
# Build
./mvnw clean package -DskipTests

# Run
./mvnw spring-boot:run

# Or run the JAR
java -jar target/urlShorter-0.0.1-SNAPSHOT.jar
```

## Docker

```bash
docker build -t shur-click-backend .
docker run -p 8080:8080 --env-file .env shur-click-backend
```

## Features

- Short URL creation and management
- Click analytics (geo, device, timestamp)
- JWT-based authentication
- OTP-based registration/password reset
- Google OAuth login
- Rate limiting (per-IP)
- Pro subscription with Razorpay
- Redis caching for hot URLs
- User feedback submission