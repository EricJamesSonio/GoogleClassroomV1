from app.core.security import hash_password

EDUCATORS = [
    {"name": "Educator One",   "email": "edu1@gmail.com", "password": "edu1", "role": "educator"},
    {"name": "Educator Two",   "email": "edu2@gmail.com", "password": "edu2", "role": "educator"},
    {"name": "Educator Three", "email": "edu3@gmail.com", "password": "edu3", "role": "educator"},
    {"name": "Educator Four",  "email": "edu4@gmail.com", "password": "edu4", "role": "educator"},
    {"name": "Educator Five",  "email": "edu5@gmail.com", "password": "edu5", "role": "educator"},
]

STUDENTS = [
    {"name": "Student One",       "email": "stud1@gmail.com",  "password": "stud1",  "role": "student"},
    {"name": "Student Two",       "email": "stud2@gmail.com",  "password": "stud2",  "role": "student"},
    {"name": "Student Three",     "email": "stud3@gmail.com",  "password": "stud3",  "role": "student"},
    {"name": "Student Four",      "email": "stud4@gmail.com",  "password": "stud4",  "role": "student"},
    {"name": "Student Five",      "email": "stud5@gmail.com",  "password": "stud5",  "role": "student"},
    {"name": "Student Six",       "email": "stud6@gmail.com",  "password": "stud6",  "role": "student"},
    {"name": "Student Seven",     "email": "stud7@gmail.com",  "password": "stud7",  "role": "student"},
    {"name": "Student Eight",     "email": "stud8@gmail.com",  "password": "stud8",  "role": "student"},
    {"name": "Student Nine",      "email": "stud9@gmail.com",  "password": "stud9",  "role": "student"},
    {"name": "Student Ten",       "email": "stud10@gmail.com", "password": "stud10", "role": "student"},
    {"name": "Student Eleven",    "email": "stud11@gmail.com", "password": "stud11", "role": "student"},
    {"name": "Student Twelve",    "email": "stud12@gmail.com", "password": "stud12", "role": "student"},
    {"name": "Student Thirteen",  "email": "stud13@gmail.com", "password": "stud13", "role": "student"},
    {"name": "Student Fourteen",  "email": "stud14@gmail.com", "password": "stud14", "role": "student"},
    {"name": "Student Fifteen",   "email": "stud15@gmail.com", "password": "stud15", "role": "student"},
    {"name": "Student Sixteen",   "email": "stud16@gmail.com", "password": "stud16", "role": "student"},
    {"name": "Student Seventeen", "email": "stud17@gmail.com", "password": "stud17", "role": "student"},
    {"name": "Student Eighteen",  "email": "stud18@gmail.com", "password": "stud18", "role": "student"},
    {"name": "Student Nineteen",  "email": "stud19@gmail.com", "password": "stud19", "role": "student"},
    {"name": "Student Twenty",    "email": "stud20@gmail.com", "password": "stud20", "role": "student"},
]


def get_seed_users() -> list[dict]:
    all_users = EDUCATORS + STUDENTS
    return [
        {
            "name": u["name"],
            "email": u["email"],
            "password_hash": hash_password(u["password"]),
            "role": u["role"],
        }
        for u in all_users
    ]