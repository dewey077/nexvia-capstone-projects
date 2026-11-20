# Individual Reflection: Praveen Kumar

**How I worked:** I built both projects with guidance from an AI assistant that explained each step. I created the files, ran the code on my own machine, tested every feature, and fixed the errors that came up. The reflections below describe what I did and learned myself.

## FS-01 Multi-Vendor E-Commerce Marketplace

**What I owned:** I set up and ran the complete FS-01 project: the Node.js and Express API, the MongoDB Atlas database, and the React frontend with three roles (customer, vendor and admin). I worked through the full flow myself, from vendor approval and product upload to search, cart, checkout with coupons, order tracking, invoices and the admin analytics page, and I tested each step.

**What I learned:** I learned how role-based access works with JWT login, and how a marketplace splits one payment between several vendors and the platform commission. I also learned why a coupon discount has to be shared across the items in an order, and how fallbacks (an in-memory cart instead of Redis, MongoDB search instead of Elasticsearch) make an app easier to run anywhere. I learned how to organize one repository for two projects with Git and GitHub.

**Hardest problem and how I solved it:** After setup, two errors stopped me. The user model failed to save because the newer Mongoose version no longer accepts the old callback style, and an invalid coupon code crashed with "cannot read properties of null". I read the error messages, found the exact file and line, and fixed both: I changed the hook to a plain async function, and I added a check for a missing coupon before using it.

**What I would improve:** I would connect the real Razorpay checkout popup so vendors receive real payouts, add email notifications for orders, and deploy the frontend and backend separately.

## FS-03 Learning Management System with Live Classes

**What I owned:** I set up and ran the complete FS-03 project: the API, the React frontend, and every feature on it. These are course and lesson creation, video upload, the student learning page, quizzes, the certificate, the instructor revenue dashboard and the live class with chat. I tested each feature with an instructor account and with student accounts, including a second browser window for the live class.

**What I learned:** I learned how a video pipeline works. An uploaded video is converted by FFmpeg into HLS streaming pieces in a background job, and the browser plays it with hls.js. I learned how WebRTC live video works, where the browsers connect to each other and the server only helps them find each other through Socket.IO. I also learned how to hide lesson videos from students who have not enrolled, and how to grade a quiz on the server so the answers are never sent to the student.

**Hardest problem and how I solved it:** The live class was the hardest part, because the two browsers must exchange their connection details in the right order. I tested the server first with a small script that checks joining, signaling, chat and bad logins, and only then built the page. Another problem was a blank page caused by one stray typo in a file. I opened the browser console, read the error that named the exact file and line, and removed the typo.

**What I would improve:** I would serve the videos through AWS CloudFront for faster delivery, move the state management to Redux Toolkit, and deploy the project online.