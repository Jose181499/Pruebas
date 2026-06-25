from models import db
from datetime import datetime

class MovimientoStock(db.Model):
    __tablename__ = 'movimientos_stock'

    id = db.Column(db.BigInteger, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id', ondelete='CASCADE'), nullable=False)
    tipo = db.Column(db.String(20), nullable=False)  # ENTRADA, SALIDA, AJUSTE
    cantidad = db.Column(db.Integer, nullable=False)
    motivo = db.Column(db.String(100))
    referencia = db.Column(db.String(50))
    costo_unitario = db.Column(db.Numeric(12, 2))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Movimiento {self.tipo} {self.cantidad}>'