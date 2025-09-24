"""
This module takes care of starting the API Server, Loading the DB and Adding the endpoints
"""
from flask import Flask, request, jsonify, url_for, Blueprint
from api.models import db, User
from api.utils import generate_sitemap, APIException
from flask_cors import CORS
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt


api = Blueprint('api', __name__)

# Allow CORS requests to this API
CORS(api)


@api.route('/hello', methods=['POST', 'GET'])
def handle_hello():

    response_body = {
        "message": "Hello! I'm a message that came from the backend, check the network tab on the google inspector and you will see the GET request"
    }

    return jsonify(response_body), 200

# Register new users

@api.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "El usuario ya existe"}), 400

    # Hashear la password con bcrypt MUY IMPORTANTE PARA QUE LAS CONTRASEÑAS SEAN MAS SEGURAS (SALT)
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)

    user = User(email=email, password=hashed_password.decode('utf-8'), is_active=True)
    db.session.add(user)
    db.session.commit()

    return jsonify(user.serialize()), 201

# Login de usuarios 

@api.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({"message": "Email y contraseña son obligatorios."}), 400
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"message": "Credenciales invalidas"}), 401

# Verificar la password con bcrypt
    if not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({"message": "Credenciales invalidas"}), 401

    token = create_access_token(identity=user.id)
    return jsonify({"token": token, "user": user.serialize()}), 200    


# EndPoint protegido para validar el usuario validado
@api.route('/profile', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.is_active:
        return jsonify({"message": "Usuario no encontrado o inactivo"}), 404
    return jsonify(user.serialize()), 200
