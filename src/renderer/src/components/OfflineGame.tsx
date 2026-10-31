import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'

// A small runner game (jump over the obstacles) to pass the time while offline

const WIDTH = 480
const HEIGHT = 140
const GROUND = 110
const PLAYER_X = 40
const PLAYER_SIZE = 22
const GRAVITY = 0.7
const JUMP_SPEED = -9.2
const HIGH_SCORE_KEY = 'offline-game-high-score'

interface Obstacle {
  x: number
  width: number
  height: number
}

interface GameState {
  y: number
  vy: number
  speed: number
  distance: number
  obstacles: Obstacle[]
  nextObstacleAt: number
  running: boolean
  over: boolean
}

function newGame(): GameState {
  return {
    y: GROUND - PLAYER_SIZE,
    vy: 0,
    speed: 5,
    distance: 0,
    obstacles: [],
    nextObstacleAt: 200,
    running: false,
    over: false,
  }
}

function loadHighScore(): number {
  try {
    return Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0
  } catch (_e) {
    return 0
  }
}

function saveHighScore(score: number): void {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch (_e) {
    // Storage can be unavailable; the score is only a nicety
  }
}

export function OfflineGame(): React.ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const game = useRef<GameState>(newGame())
  const [highScore, setHighScore] = useState(loadHighScore)
  const highScoreRef = useRef(highScore)

  const jump = useCallback(() => {
    const g = game.current
    if (g.over) {
      game.current = { ...newGame(), running: true }
      return
    }
    g.running = true
    if (g.y >= GROUND - PLAYER_SIZE) g.vy = JUMP_SPEED
  }, [])

  // Space / arrow up jump; other keys (and typing elsewhere) are left alone
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'ArrowUp') return
      const target = e.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return
      e.preventDefault()
      jump()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [jump])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    let frame = 0
    const step = () => {
      const g = game.current

      if (g.running && !g.over) {
        g.vy += GRAVITY
        g.y = Math.min(GROUND - PLAYER_SIZE, g.y + g.vy)
        if (g.y >= GROUND - PLAYER_SIZE) g.vy = 0

        g.distance += g.speed
        g.speed = Math.min(11, g.speed + 0.002)

        g.nextObstacleAt -= g.speed
        if (g.nextObstacleAt <= 0) {
          g.obstacles.push({
            x: WIDTH,
            width: 14 + Math.random() * 14,
            height: 18 + Math.random() * 22,
          })
          g.nextObstacleAt = 180 + Math.random() * 220
        }
        for (const o of g.obstacles) o.x -= g.speed
        g.obstacles = g.obstacles.filter((o) => o.x + o.width > 0)

        for (const o of g.obstacles) {
          const hit =
            PLAYER_X + PLAYER_SIZE - 4 > o.x &&
            PLAYER_X + 4 < o.x + o.width &&
            g.y + PLAYER_SIZE > GROUND - o.height
          if (hit) {
            g.over = true
            const score = Math.floor(g.distance / 10)
            if (score > highScoreRef.current) {
              highScoreRef.current = score
              saveHighScore(score)
              setHighScore(score)
            }
          }
        }
      }

      ctx.clearRect(0, 0, WIDTH, HEIGHT)
      ctx.strokeStyle = '#9ca3af'
      ctx.fillStyle = '#4b5563'
      ctx.beginPath()
      ctx.moveTo(0, GROUND + 0.5)
      ctx.lineTo(WIDTH, GROUND + 0.5)
      ctx.stroke()

      ctx.fillStyle = g.over ? '#dc2626' : '#2563eb'
      ctx.fillRect(PLAYER_X, g.y, PLAYER_SIZE, PLAYER_SIZE)
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(PLAYER_X + 13, g.y + 5, 4, 4)

      ctx.fillStyle = '#4b5563'
      for (const o of g.obstacles) ctx.fillRect(o.x, GROUND - o.height, o.width, o.height)

      ctx.font = '12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`HI ${String(highScoreRef.current).padStart(5, '0')}`, WIDTH - 80, 18)
      ctx.fillText(String(Math.floor(g.distance / 10)).padStart(5, '0'), WIDTH - 10, 18)

      ctx.textAlign = 'center'
      ctx.font = '14px sans-serif'
      if (g.over) {
        ctx.fillText('Game over - press Space or click to restart', WIDTH / 2, 60)
      } else if (!g.running) {
        ctx.fillText('Press Space or click to play', WIDTH / 2, 60)
      }

      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      onMouseDown={jump}
      aria-label="Offline game: press Space or click to jump"
      className="max-w-full cursor-pointer select-none border-b border-border"
    />
  )
}
