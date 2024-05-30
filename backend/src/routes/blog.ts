import { Hono } from "hono";
import { verify } from "hono/jwt";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import {createPostInput, updatePostInput} from "@moin17/writewave-common";


export const blogRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string;
    },
    Variables: {
        userId: string;
    }
}>();


blogRouter.use("/*",async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header) {
        c.status(401);
        return c.json({
            error: "unauthorized"
        });
    }
    const token = header.split(" ")[1];
    type JwtPayload = {
        id: string
    }
    try {
        const user = await verify(token, c.env.JWT_SECRET) as JwtPayload;
        c.set("userId" ,user.id)
        await next();
    } catch (err) {
        if (err) {
            c.status(401);
            return c.json({
                error: "unauthorized"
            });
        }
    }
});


blogRouter.post('/', async (c) => {
    const userId = c.get("userId");

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success } = createPostInput.safeParse(body);
    if (!success) {
        c.status(400);
        return c.json({ error: "Invalid Inputs"});
    }

    try {
        const blog = await prisma.post.create({
            data: {
                title: body.title,
                content: body.content,
                authorId: userId
            }
        });

        return c.json({
            id: blog.id
        });
    } catch (err) {
        c.status(403);
        return c.json({
            error: "Invalid Inputs"
        });
    }
});


blogRouter.put('/', async (c) => {
    const userId = c.get("userId");

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success } = updatePostInput.safeParse(body);
    if (!success) {
        c.status(400);
        return c.json({ error: "Invalid Inputs"});
    }

    try {
        await prisma.post.update({
            where: {
                id: body.id,
                authorId: userId
            },
            data: {
                title: body.title,
                content: body.content
            }
        });

        return c.json({
            msg: "Update successfully"
        });
    } catch (err) {
        c.status(403);
        return c.json({
            error: "Invalid Inputs"
        });
    }
});


blogRouter.get('/id/:id', async (c) => {
    const userId = c.get("userId");

    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const id = c.req.param("id");
    console.log(id)
    if (!id) {
        c.status(401);
        return c.json({
            error: "Id not found"
        })
    }

    const blog = await prisma.post.findUnique({
        where: {
            id: id,
            authorId: userId
        }
    });

    if (!blog) {
        return c.json({
            msg: "Blog not found!"
        });
    }

    return c.json({
        blog
    });
});


blogRouter.get('/bulk', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const blogs = await prisma.post.findMany({});

    return c.json({blogs});
});