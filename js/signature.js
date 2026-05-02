export class SignaturePad {
  constructor(canvas) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.drawing = false
    this._empty = true
    this._setup()
    this._bind()
  }

  _setup() {
    const dpr = window.devicePixelRatio || 1
    const w = this.canvas.offsetWidth || 400
    const h = 140
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.ctx.scale(dpr, dpr)
    this.ctx.strokeStyle = '#111827'
    this.ctx.lineWidth = 2.5
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  _bind() {
    const c = this.canvas
    c.addEventListener('mousedown', e => {
      this.drawing = true; this._empty = false
      const p = this._pos(e); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y)
    })
    c.addEventListener('mousemove', e => {
      if (!this.drawing) return
      const p = this._pos(e); this.ctx.lineTo(p.x, p.y); this.ctx.stroke()
    })
    c.addEventListener('mouseup', () => { this.drawing = false })
    c.addEventListener('mouseleave', () => { this.drawing = false })
    c.addEventListener('touchstart', e => {
      e.preventDefault(); this.drawing = true; this._empty = false
      const p = this._pos(e.touches[0]); this.ctx.beginPath(); this.ctx.moveTo(p.x, p.y)
    }, { passive: false })
    c.addEventListener('touchmove', e => {
      e.preventDefault(); if (!this.drawing) return
      const p = this._pos(e.touches[0]); this.ctx.lineTo(p.x, p.y); this.ctx.stroke()
    }, { passive: false })
    c.addEventListener('touchend', () => { this.drawing = false })
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this._empty = true
  }

  isEmpty() { return this._empty }
  toDataURL() { return this.canvas.toDataURL('image/png') }
}
