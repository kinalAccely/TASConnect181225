# 🐛 Troubleshooting Guide - Blank Screen Issue

## ❌ Problem: Blank Screen

If you see a blank white screen when running the app, follow these steps:

---

## ✅ Solution 1: Check the Port Number

### **The Issue:**
The dev server might be running on a different port than what you're viewing in the browser.

### **How to Fix:**
1. Look at your terminal where you ran `npm run dev`
2. Find the line that says: `Local: http://localhost:XXXX/`
3. Note the port number (e.g., 5173, 5174, etc.)
4. Make sure your browser is visiting the **same port number**

### **Example:**
If terminal shows:
```
➜  Local:   http://localhost:5174/
```

Then visit: **`http://localhost:5174`** (not 5173!)

---

## ✅ Solution 2: Check Browser Console

### **Steps:**
1. Press **F12** to open Developer Tools
2. Click the **Console** tab
3. Look for any red error messages

### **Common Errors:**

#### **Error: "Failed to fetch"**
- **Cause:** Backend API is not running
- **Fix:** Make sure `http://13.126.99.61:8000` is accessible

#### **Error: "Cannot read property 'useAuth' of undefined"**
- **Cause:** Import issue with AuthContext
- **Fix:** Already fixed in the latest code

#### **Error: "Module not found"**
- **Cause:** Missing dependency
- **Fix:** Run `npm install`

---

## ✅ Solution 3: Clear Browser Cache

### **Steps:**
1. Press **Ctrl + Shift + Delete** (Windows) or **Cmd + Shift + Delete** (Mac)
2. Select "Cached images and files"
3. Click "Clear data"
4. Refresh the page (**Ctrl + F5** or **Cmd + Shift + R**)

---

## ✅ Solution 4: Clear Browser Storage

### **Steps:**
1. Press **F12** to open Developer Tools
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Local Storage** → `http://localhost:XXXX`
4. Right-click → **Clear**
5. Do the same for **Session Storage**
6. Refresh the page

---

## ✅ Solution 5: Restart Dev Server

### **Steps:**
1. In terminal, press **Ctrl + C** to stop the server
2. Run `npm run dev` again
3. Note the new port number
4. Visit the correct port in your browser

---

## ✅ Solution 6: Check for Port Conflicts

### **If port 5173 is already in use:**

**Windows:**
```powershell
# Find what's using port 5173
netstat -ano | findstr :5173

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Mac/Linux:**
```bash
# Find what's using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

Then restart: `npm run dev`

---

## ✅ Solution 7: Reinstall Dependencies

### **If nothing else works:**
```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install

# Restart server
npm run dev
```

---

## 🔍 How to Debug

### **Step 1: Check Terminal Output**
Look for errors in the terminal where `npm run dev` is running.

### **Step 2: Check Browser Console**
Press F12 and look for red error messages.

### **Step 3: Check Network Tab**
1. Press F12
2. Go to **Network** tab
3. Refresh the page
4. Look for failed requests (red status codes)

### **Step 4: Verify Files Exist**
Make sure these files exist:
- `src/pages/AuthPage.jsx`
- `src/components/auth/LoginForm.jsx`
- `src/components/auth/RegisterForm.jsx`
- `src/components/ProtectedRoute.jsx`
- `src/contexts/AuthContext.jsx`
- `src/services/authService.js`

---

## ✅ Quick Checklist

Before asking for help, verify:

- [ ] I'm visiting the correct port number
- [ ] The dev server is running without errors
- [ ] I've checked the browser console for errors
- [ ] I've cleared browser cache and storage
- [ ] I've tried restarting the dev server
- [ ] My `node_modules` folder exists
- [ ] All auth files are present in `src/`

---

## 🆘 Still Not Working?

If you've tried everything above and still see a blank screen:

1. **Take a screenshot** of:
   - The browser (showing the blank page)
   - The browser console (F12 → Console tab)
   - The terminal (showing npm run dev output)

2. **Share the error messages** from the console

3. **Check if the backend API is accessible**:
   - Visit: `http://13.126.99.61:8000/docs`
   - If this doesn't load, the backend is down

---

## 🎯 Most Common Issue

**90% of blank screens are caused by:**
- Viewing the wrong port number (e.g., visiting 5173 when server is on 5174)

**Always check the terminal output for the correct port!**

---

**Good luck! 🚀**
