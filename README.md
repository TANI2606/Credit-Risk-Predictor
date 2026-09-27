# 🏦 Credit Risk Predictor Engine

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org/)
[![Render](https://img.shields.io/badge/Render-%46E3B7.svg?style=flat&logo=render&logoColor=white)](https://render.com/)

An end-to-end Machine Learning web application designed to evaluate a loan applicant's financial profile and predict a calibrated default probability alongside a pass/review lending decision in real-time. 

**🔴 Live Application:** [Credit Risk Engine](https://credit-risk-predictor-1-m8xq.onrender.com)

---

## 🚀 Project Overview

This project seamlessly integrates a trained predictive model with a high-performance REST API and a custom, modern web interface. It processes user-inputted financial ledgers to instantly output a risk gauge, an optimal threshold, and an automated model decision for credit approvals.

### ✨ Key Features
* **Machine Learning Engine:** Utilizes a robust, serialized ML pipeline featuring comprehensive preprocessing (handling missing values, scaling, and categorical encoding) and a finely-tuned classification model to output raw default probabilities.
* **Asynchronous API:** Powered by FastAPI, featuring strict Pydantic data validation for financial inputs and dynamic CORS middleware for secure, sub-second inference.
* **Premium User Interface:** A responsive, sleek frontend featuring interactive ledger inputs, dynamic SVG risk gauge animations, and ambient canvas background effects for a polished user experience.
* **Cloud Deployment:** Both the backend inference engine and the frontend UI are hosted continuously on Render using Python.

---

## 🛠️ Technology Stack

| Component | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6+), Fetch API, Canvas API |
| **Backend** | FastAPI, Uvicorn, Python 3.11 |
| **Machine Learning** | Scikit-Learn, Pandas, NumPy, Joblib |
| **Deployment** | Render, Git, GitHub |

---

## ⚙️ Local Installation & Setup

To run this project locally on your machine, follow these steps:

**1. Clone the repository**
```bash
# Replace with your actual repository URL
git clone [https://github.com/YourUsername/Credit-Risk-Predictor.git](https://github.com/YourUsername/Credit-Risk-Predictor.git)
cd Credit-Risk-Predictor
