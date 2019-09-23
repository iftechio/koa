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
})
