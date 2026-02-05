# 🚀 Quick Start Guide - TASConnect Authentication

## ⚡ Get Started in 3 Steps

### **Step 1: Start the Server**
```bash
npm run dev
```

### **Step 2: Open Your Browser**
Visit: `http://localhost:5173`

You'll automatically be redirected to the login page.

### **Step 3: Create Your Account**

1. Click the **"Sign Up"** tab
2. Fill in the form:
   ```
   Username:        myusername
   Display Name:    My Full Name
   Email:           my.email@example.com (optional)
   Password:        MyPassword123
   Confirm:         MyPassword123
   ```
3. Click **"Create Account"**
4. You'll be logged in and redirected to `/chat`

---

## ✅ Test the Chatbot

Once logged in:

1. Type a message in the chat: **"Hello, what can you do?"**
2. Press Enter or click Send
3. **The AI will respond!** 🎉

---

## 🔑 Login Next Time

1. Visit the app
2. Enter your username/email and password
3. Check **"Remember me"** to stay logged in
4. Click **"Sign In"**

---

## 📋 What You Can Do Now

✅ **Chat with AI** - Ask questions, get responses
✅ **Create Threads** - Multiple conversations
✅ **Load History** - Previous chats persist
✅ **Switch Assistants** - Chat, Training, Live Demo modes
✅ **Sandbox Demos** - Interactive live demos

---

## 🎨 Features

- **Beautiful UI** - Matches TASConnect theme perfectly
- **Secure** - Token-based authentication
- **Fast** - Instant login/logout
- **Persistent** - Remember me keeps you logged in
- **Validated** - Real-time form validation
- **Responsive** - Works on all devices

---

## 🐛 Troubleshooting

### **Can't Login?**
- Check your username/password
- Make sure backend API is running at `http://13.126.99.61:8000`
- Check browser console for errors

### **Chatbot Not Responding?**
- Make sure you're logged in
- Check that you see your auth token in browser storage
- Verify backend is accessible

### **Stuck on Login Page?**
- Clear browser storage: `localStorage.clear()` in console
- Refresh the page
- Try registering a new account

---

## 📚 More Info

- **Full Documentation**: See `AUTHENTICATION.md`
- **Implementation Details**: See `IMPLEMENTATION_SUMMARY.md`
- **API Docs**: Visit `http://13.126.99.61:8000/docs`

---

## 🎉 That's It!

You're ready to use TASConnect with full authentication! Enjoy chatting with your AI assistant! 🤖✨

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation files.
