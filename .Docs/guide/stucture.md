backend/
├── .env
├── requirements.txt
└── app/
    ├── __init__.py
    ├── main.py
    ├── core/
    │   ├── __init__.py
    │   ├── config.py
    │   └── security.py
    ├── db/
    │   ├── __init__.py
    │   └── database.py
    ├── models/
    │   ├── __init__.py
    │   ├── user.py
    │   ├── class_model.py
    │   ├── class_member.py
    │   ├── class_invitation.py
    │   ├── meeting.py
    │   ├── meeting_invitation.py
    │   └── message.py
    ├── seeds/
    │   ├── __init__.py
    │   └── user_seeds.py
    ├── schemas/
    │   ├── __init__.py
    │   ├── auth_schema.py        ← empty for now
    │   ├── class_schema.py       ← empty for now
    │   └── meeting_schema.py     ← empty for now
    ├── routes/
    │   ├── __init__.py
    │   ├── auth_routes.py        ← empty for now
    │   ├── class_routes.py       ← empty for now
    │   ├── meeting_routes.py     ← empty for now
    │   └── chat_routes.py        ← empty for now
    ├── services/
    │   ├── __init__.py
    │   ├── auth_service.py       ← empty for now
    │   ├── class_service.py      ← empty for now
    │   ├── meeting_service.py    ← empty for now
    │   ├── agora_service.py      ← empty for now
    │   └── cloudinary_service.py ← empty for now
    ├── websocket/
    │   ├── __init__.py
    │   └── meeting_chat.py       ← empty for now
    └── scheduler/
        ├── __init__.py
        └── meeting_scheduler.py  ← empty for now