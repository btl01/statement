import { prisma } from '$lib/prisma'
import type { Post } from '@prisma/client'

export const getPosts = async () => {
	return prisma.post.findMany({
		include: {
			author: true,
			tags: {
				select: {
					name: true,
				},
			},
		},
	})
}

export const savePost = async (post: Post & { tags: string[] }) => {
	const { tags, ...data } = post
	const tagsId = []
	for (const t of tags) {
		tagsId.push(
			await prisma.tag.upsert({
				where: {
					name: t,
				},
				update: {},
				create: {
					name: t,
					description: '',
				},
				select: {
					id: true,
				},
			}),
		)
	}
	prisma.post.create({
		data: {
			...data,
			tags: {
				connect: tagsId,
			},
		},
	})
}

export const updatePost = async (post: Post) => {
	return prisma.post.update({
		where: {
			id: post.id,
		},
		data: post,
	})
}

export const deletePost = async (id: string) => {
	return prisma.post.delete({
		where: {
			id,
		},
	})
}

export const searchPost = async (q: string) => {
	return prisma.post.findRaw({
		filter: {
			$text: { $search: q },
		},
	})
}
