import { likePost, dislikePost } from '$lib/db/reaction'
import { hidePost } from '$lib/db/user'
import { prisma } from '$lib/prisma'
import { error, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'
import { deletePost } from '$lib/db/post'
import { saveMediaFile } from '$utils/server'

const verifyId = async ({ locals, request }: { locals: App.Locals; request: Request }) => {
	if (!locals.user) throw error(404)

	const data = await request.formData()
	const postId = <string>data.get('postId')
	return {
		userId: locals.user.id,
		postId,
	}
}

export const actions: Actions = {
	like: async ({ locals, request }) => {
		const params = await verifyId({ locals, request })
		return await likePost(params)
	},
	dislike: async ({ locals, request }) => {
		const params = await verifyId({ locals, request })
		return await dislikePost(params)
	},
	hide: async ({ locals, request }) => {
		const params = await verifyId({ locals, request })
		return await hidePost(params)
	},
	delete: async ({ locals, request }) => {
		const params = await verifyId({ locals, request })
		return await deletePost(params.postId)
	},
	create: async ({ locals, request }) => {
		if (!locals.user) throw error(404)

		const data = await request.formData()

		interface Media {
			images: string[]
			videos: string[]
			audios: string[]
		}
		const media: Media = {
			images: [],
			videos: [],
			audios: [],
		}
		const tags: string[] = []
		const options: { value: string; type: number }[] = []
		const rightOption = data.get('rightOption')

		for (const [k, v] of data.entries()) {
			if (k === 'option') {
				const value = v as string
				const type = v === rightOption ? 1 : 0
				options.push({ value, type })
				continue
			}
			if (k === 'tag') {
				tags.push(v as string)
				continue
			}
			if (k in media && v instanceof Blob && v.size !== 0) {
				media[k as keyof Media].push(await saveMediaFile({ blob: v }))
				continue
			}
		}

		const post = await prisma.post.create({
			data: {
				title: data.get('title') as string,
				description: data.get('description') as string,
				author: {
					connect: {
						id: locals.user.id,
					},
				},
				tags: {
					connectOrCreate: tags.map((name) => {
						return {
							where: {
								name,
							},
							create: {
								name,
								description: '',
							},
						}
					}),
				},
				...media,
				options,
			},
		})

		throw redirect(307, `/${locals.locale}/explore/post?id=${post.id}`)
	},
}
