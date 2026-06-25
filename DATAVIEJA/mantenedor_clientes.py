from flask import Blueprint, render_template, request, redirect
from database import db_query, db_execute, obtener_productos
import pandas as pd
from flask import request, redirect, flash
from database import db_query, db_execute

mantenedor_clientes_bp = Blueprint("mantenedor_clientes", __name__)

@mantenedor_clientes_bp.route("/mantenedor/clientes/gestion")
def gestionar_cliente():
    return render_template("mantenedor/gestion_clientes.html")

@mantenedor_clientes_bp.route("/mantenedor/clientes/nuevo")
def insertar_cliente():
    return render_template("mantenedor/nuevo_cliente.html")
