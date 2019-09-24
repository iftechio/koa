'use strict'

const request = require('supertest')
const assert = require('assert')
const Koa = require('../..')

describe('app.createRouter', () => {
  it('should route', async () => {
    const app = new Koa()

    const router1 = app.createRouter('/route1')
    router1.get('/abc', ctx => {
      ctx.body = 'gocha1'
    })
    const server = app.listen()

    await request(server)
      .get('/')
      .expect(404)

    await request(server)
      .get('/route1/abc')
      .expect(200)
    await request(server)
      .get('/route2/abc')
      .expect(404)

    const router2 = app.createRouter('/route2')
    router2.get('/abc', ctx => {
      ctx.body = 'gocha2'
    })
    await request(server)
      .get('/route2/abc')
      .expect('gocha2')
  })

  it('should decode param', async () => {
    const app = new Koa()
    const server = app.listen()
    const router = app.createRouter('/router')
    router.get('/:foo/abc', ctx => {
      assert.deepEqual(ctx.params, { foo: 'bar' })
      ctx.status = 200
    })
    await request(server)
      .get('/router/bar/abc')
      .expect(200)
  })

  it('should compose middleware', async () => {
    const app = new Koa()
    const router = app.createRouter('/router')

    const calls = []

    router.use((ctx, next) => {
      calls.push(1)
      return next().then(() => {
        calls.push(6)
      })
    })

    router.use((ctx, next) => {
      calls.push(2)
      return next().then(() => {
        calls.push(5)
      })
    })

    router.use((ctx, next) => {
      calls.push(3)
      return next().then(() => {
        calls.push(4)
      })
    })

    router.get('/get', ctx => {})

    const server = app.listen()

    await request(server)
      .get('/router/get')
      .expect(404)

    assert.deepEqual(calls, [1, 2, 3, 4, 5, 6])
  })
})
