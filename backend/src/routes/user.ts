import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
import {signinInput, signupInput} from "@moin17/writewave-common";

export const userRouter = new Hono<{
    Bindings: {
        DATABASE_URL: string;
        JWT_SECRET: string
    }
}>();


userRouter.post('/signup', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env?.DATABASE_URL,
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success } = signupInput.safeParse(body);
    if (!success) {
        c.status(400);
        return c.json({ error: "Invalid Inputs"});
    }
    try {
        const user = await prisma.user.create( {
            data: {
                email: body.email,
                password: body.password,
                name: body.name
            }
        });

        const token = await sign({ id: user.id}, c.env.JWT_SECRET);
        return c.json({
            token
        });
    } catch (err) {
        c.status(402);
        return c.json({
            msg: "Invalid Inputs"
        });
    }
});


userRouter.post('/signin', async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL
    }).$extends(withAccelerate());

    const body = await c.req.json();
    const { success } = signinInput.safeParse(body);
    if (!success) {
        c.status(400);
        return c.json({ error: "Invalid Inputs"});
    }
    const user = await prisma.user.findUnique({
        where: {
            email: body.email,
            password: body.password
        }
    });
    if (!user) {
        c.status(403);
        return c.json({
            msg: "User not found!"
        });
    }

    const token = await sign({id: user.id}, c.env.JWT_SECRET);
    return c.json({ token });
});