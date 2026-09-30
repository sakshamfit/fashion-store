import {neon} from '@neondatabase/serverless';
import {Line,getProduct} from './catalog';
import {databaseUrl} from '@/db';
export const bindings=process.env as unknown as {STRIPE_SECRET_KEY?:string;COMMERCE_ENABLED?:string;RESEND_API_KEY?:string;ORDER_EMAIL_FROM?:string};
let client:ReturnType<typeof neon>|undefined,ready:Promise<unknown>|undefined;
const schema=[
`CREATE TABLE IF NOT EXISTS carts (id text PRIMARY KEY NOT NULL, lines text DEFAULT '[]' NOT NULL, updated_at bigint NOT NULL)`,
`CREATE TABLE IF NOT EXISTS checkout_sessions (id text PRIMARY KEY NOT NULL, cart_id text NOT NULL, status text DEFAULT 'pending' NOT NULL, created_at bigint NOT NULL)`,
`CREATE TABLE IF NOT EXISTS messages (id text PRIMARY KEY NOT NULL, name text NOT NULL, email text NOT NULL, message text NOT NULL, created_at bigint NOT NULL)`,
`CREATE TABLE IF NOT EXISTS subscribers (email text PRIMARY KEY NOT NULL, created_at bigint NOT NULL)`];
/** Run a parameterised Postgres query ($1, $2, ...). Tables are created on first use. */
export async function query<T=Record<string,unknown>>(text:string,params:unknown[]=[]):Promise<T[]>{client??=neon(databaseUrl());const sql=client;ready??=sql.transaction(schema.map(s=>sql.query(s))).catch(e=>{ready=undefined;throw e});await ready;return await sql.query(text,params) as T[]}
export function json(data:unknown,status=200,headers:Record<string,string>={}){return Response.json(data,{status,headers:{'Cache-Control':'no-store',...headers}})}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');return !!origin&&origin===new URL(req.url).origin}
export function sessionId(req:Request){const s=req.headers.get('cookie')?.match(/(?:^|;\s*)vyrn_cart=([a-f0-9-]{36})(?:;|$)/)?.[1];return s||null}
export function cookie(id:string,req:Request){return `vyrn_cart=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${new URL(req.url).protocol==='https:'?'; Secure':''}`}
export async function readCart(id:string):Promise<Line[]>{const [row]=await query<{lines:string}>('SELECT lines FROM carts WHERE id = $1',[id]);if(!row)return [];const parsed=JSON.parse(row.lines);return parsed.filter((l:Line)=>getProduct(l.id))}
export function validLine(l:Line,allowZero=false){const p=getProduct(l?.id);return !!p&&p.sizes.includes(l.size)&&l.color===p.color&&Number.isInteger(l.quantity)&&l.quantity>=(allowZero?0:1)&&l.quantity<=p.stock}
export async function readBody(req:Request){const raw=await req.text();if(raw.length>12000)throw Error('Request too large');return JSON.parse(raw)}
export function paymentReady(){return bindings.COMMERCE_ENABLED==='true'&&!!bindings.STRIPE_SECRET_KEY}
