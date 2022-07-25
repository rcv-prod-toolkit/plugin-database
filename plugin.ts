import { PluginContext } from '@rcv-prod-toolkit/types'
import { JsonDB } from 'node-json-db'
import { Config } from 'node-json-db/dist/lib/JsonDBConfig'
import uniqid from 'uniqid'

module.exports = async (ctx: PluginContext) => {
  const namespace = ctx.plugin.module.getName()

  const config = new Config(
    `modules/plugin-database/data/league-prod-toolkit`,
    true,
    false,
    '/'
  )

  const client = new JsonDB(config)

  // Answer requests to get state
  ctx.LPTE.on(namespace, 'request', async (e: any) => {
    if (!e.collection) {
      return ctx.log.warn('no collection passed for request')
    }

    try {
      const filter = e.filter
      const sort = e.sort
      const limit = e.limit || 10

      const url = `/${e.collection}${e.id !== undefined ? '/' + e.id : ''}`

      const data = client.getObject<{ [k: string]: any }>(url)
      let array = Object.values(data)

      if (filter !== undefined) {
        array.filter(filter)
      }

      if (sort !== undefined) {
        array.sort(sort)
      }

      if (limit !== undefined) {
        array.slice(0, limit)
      }

      ctx.LPTE.emit({
        meta: {
          type: e.meta.reply,
          namespace: 'reply',
          version: 1
        },
        data: e.id !== undefined ? data : array || []
      })
    } catch (err: any) {
      ctx.log.debug(err.message)
      ctx.LPTE.emit({
        meta: {
          type: e.meta.reply,
          namespace: 'reply',
          version: 1
        },
        data: e.id !== undefined ? undefined : []
      })
    }
  })

  ctx.LPTE.on(namespace, 'insertOne', async (e: any) => {
    if (!e.collection) {
      return ctx.log.warn('no collection passed for insertOne')
    }

    try {
      const id = uniqid()
      client.push(`/${e.collection}/${id}`, { id: id, ...e.data })

      ctx.LPTE.emit({
        meta: {
          type: e.meta.reply,
          namespace: 'reply',
          version: 1
        },
        id
      })
    } catch (err: any) {
      ctx.log.debug(err.message)
    }
  })

  ctx.LPTE.on(namespace, 'updateOne', async (e: any) => {
    if (!e.collection || !e.id) {
      return ctx.log.warn('no collection or id passed for updateOne')
    }

    try {
      client.push(`/${e.collection}/${e.id}`, e.data, true)

      ctx.LPTE.emit({
        meta: {
          type: e.meta.reply,
          namespace: 'reply',
          version: 1
        }
      })
    } catch (err: any) {
      ctx.log.debug(err.message)
    }
  })

  ctx.LPTE.on(namespace, 'delete', async (e: any) => {
    if (!e.collection) {
      return ctx.log.warn('no collection passed for delete')
    }

    try {
      client.delete(`/${e.collection}`)
    } catch (err: any) {
      ctx.log.debug(err.message)
    }
  })

  ctx.LPTE.on(namespace, 'deleteOne', async (e: any) => {
    if (!e.collection || !e.id) {
      return ctx.log.warn('no collection or id passed for updateOne')
    }

    try {
      client.delete(`/${e.collection}/${e.id}`)

      ctx.LPTE.emit({
        meta: {
          type: e.meta.reply,
          namespace: 'reply',
          version: 1
        }
      })
    } catch (err: any) {
      ctx.log.debug(err.message)
    }
  })

  // Emit event that we're ready to operate
  ctx.LPTE.emit({
    meta: {
      type: 'plugin-status-change',
      namespace: 'lpt',
      version: 1
    },
    status: 'RUNNING'
  })
}
