# EvalScan — OMR Evaluation System

EvalScan is a professional, full-stack OMR (Optical Mark Recognition) evaluation platform designed to automate the processing of scanned exam sheets. It supports batch processing, interactive result verification with coordinate-based highlighting, and seamless integration with external scanning hardware.

## 🚀 Key Features
- **Dashboard**: Real-time statistics on tests, batches, and processing status.
- **Test Management**: Create and track exams/tests.
- **Batch Processing**: Upload ZIP files of scanned sheets for automated extraction via a high-performance JAR processor.
- **Interactive Review**: Verify results with pulsing red highlights on original scanned images based on field coordinates.
- **Data Export**: Export final, cleaned results as structured JSON (e.g., mapping `RollNo` to `StudentCode`).
- **Public Integration API**: Specialized endpoints for third-party scanning apps to push data directly using API Keys.
- **API Documentation**: Built-in Swagger UI for all backend services.

---

## 🛠️ Technology Stack
- **Frontend**: React (Vite), CSS3 (Custom Design System), Redux.
- **Backend**: Node.js, Express.
- **Database**: MongoDB (Mongoose).
- **Processing**: Java-based OMR extraction engine (JAR).

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Node.js**: v18+
- **MongoDB**: Running locally or via URI.
- **Java**: Required to run the `evalomr.jar` processor.

### 2. Environment Configuration
Create a `.env` file in the `eval-api` directory:
```env
PORT=3000
MONGO_URI=mongodb://localhost:27017/evalscan
JWT_SECRET=your_jwt_secret_here
API_KEY=evalscan_secret_key_2024
EXTRACTED_DIR=./extracted
UPLOADS_DIR=./uploads
RESULTS_DIR=./results
JAR_PATH=./evalomr.jar
```

### 3. Installation
From the root directory:
```bash
# Install backend dependencies
cd eval-api
npm install

# Install frontend dependencies
cd ../eval-ui
npm install
```

### 4. Running the Application
**Backend:**
```bash
cd eval-api
npm run dev
```
Docs: [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

**Frontend:**
```bash
cd eval-ui
npm run dev
```
UI: [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Production Setup (AWS EC2 Monolith)

For a robust, non-Dockerized production deployment on AWS:

### 1. Prerequisite (OpenJDK 11)
The OMR engine requires specifically **OpenJDK 11**:
```bash
sudo apt install openjdk-11-jre-headless -y
```

### 2. PM2 Process Management
The backend should be managed by PM2 using the provided `ecosystem.config.js`:
```bash
cd eval-api
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 3. Nginx Configuration
Use the `nginx.conf.template` to configure a reverse proxy. 
- Serve React `dist` at the root `/`.
- Proxy `/api` to `localhost:3000`.
- Proxy `/api-docs` to `localhost:3000`.

### 4. Automated Deployment
A `deploy.sh` script is provided to automate build and restart cycles:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🔗 Integration Guide
For third-party integrations, use the **Public Discovery API**:
- **Endpoint**: `GET http://localhost:3000/api/tests/public-list?apiKey=YOUR_KEY`
- **Result**: Returns a list of all tests and their unique `publicUploadUrl`.

---

## 👤 Initial Admin Credentials
- **Email**: `admin@eval.com`
- **Password**: `Admin@123`
