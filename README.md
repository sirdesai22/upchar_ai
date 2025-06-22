# 🏥 Upchar AI – AI-Powered Multilingual WhatsApp Hospital Assistant

> Talk to your hospital in your own language. Book, cancel, or reschedule appointments — all via WhatsApp.

---

## 🚀 Overview

**Upchar AI** is a multilingual, WhatsApp-based AI assistant that enables users to interact with hospitals using natural human language. Patients can describe symptoms, register, and schedule appointments — all without knowing department names or navigating complicated apps.  

It uses **agentic AI** principles to understand, plan, and act — replacing manual reception work with intelligent automation.

---

## 🎯 Problem Statement

Patients often struggle with:
- Language barriers in hospital systems  
- Not knowing which doctor to consult based on symptoms  
- Long wait times and overloaded reception desks  
- Repetitive manual data entry by hospital staff  
- Unclear communication and appointment errors

---

## 💡 Our Solution

Upchar AI lets users simply *text their symptoms or request in their preferred language* (e.g., Hindi, Kannada, Marathi).  
Behind the scenes, our AI agents work together to:
- Understand the user’s intent and symptoms  
- Automatically route them to the correct specialist  
- Book/reschedule/cancel appointments  
- Register them in the hospital’s database  
- Handle everything 24/7, without human intervention  

---

## 🧠 Agentic AI System

Our architecture is built on **collaborating AI agents**, each handling a specific responsibility:

| Agent | Role |
|-------|------|
| 🧠 Intent + Symptom Agent | Extracts user's request and health symptoms from natural language |
| 🌐 Translation Agent | Converts regional language to English for processing (and vice versa) |
| 📅 Booking Agent | Handles scheduling, rescheduling, and doctor availability |
| 📖 Memory Agent | Stores user preferences, visit history, and language choices |

---

## 🛠️ Tech Stack

- **LLMs + Prompt Engineering** – GeminiAPI for symptom mapping & reasoning  
- **Twilio API** – WhatsApp messaging interface  
- **Google Calendar API** – Real-time appointment management  
- **Supabase** – Hospital database + authentication  
- **Next.js** – Application Code base

---

## ⚙️ How It Works (Flow)

1. **User sends a message in their language** on WhatsApp  
2. **Translation Agent** converts it (if needed)  
3. **Intent & Symptom Agent** understands what the user wants  
4. **Booking Agent** checks calendar and assigns a doctor
6. **Confirmation is sent**, and details are saved to the DB  

---

## 🌐 Features

- ✅ Multilingual support (any regional language)  
- ✅ AI-powered symptom understanding  
- ✅ Autonomous doctor assignment  
- ✅ 24/7 availability  
- ✅ Automatic hospital record updates 

---

## 🧪 Challenges We Solved

- Integrating APIs with conflicting auth/token systems (Twilio, Google)  
- Designing inter-agent communication with clean handoffs  
- Maintaining state and session in a stateless messaging environment  
- Handling vague, real-world symptom descriptions  
- Ensuring fast and accurate multilingual parsing  

---

## 📦 Future Scope

- Add **voice-based interactions** for low-literacy users  
- Integrate with **EMR systems** for deeper hospital data  
- Enable **triage and emergency prioritization**  
- Build a **mobile dashboard for doctors & staff**  
- Add **health record generation & sharing via WhatsApp**

---

## 📸 Demo

https://youtu.be/tHS8fiP7ZEs

---

## 🤝 Team BuildBots

---

## 💬 Tagline

**“Your Words. Your Language. Your Doctor.”**

---

