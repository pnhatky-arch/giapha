import { NextResponse } from 'next/server';

const message='Sao lưu, phục hồi và xóa dữ liệu chỉ hoạt động local trên từng thiết bị. API hệ thống không được phép đọc hoặc thay đổi dữ liệu chung cho mục đích sao lưu.';
export async function GET(){return NextResponse.json({message,localOnly:true},{status:410,headers:{'Cache-Control':'no-store'}});}
export async function POST(){return NextResponse.json({message,localOnly:true},{status:410,headers:{'Cache-Control':'no-store'}});}
export async function DELETE(){return NextResponse.json({message,localOnly:true},{status:410,headers:{'Cache-Control':'no-store'}});}
