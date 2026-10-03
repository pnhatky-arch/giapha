import { NextResponse } from 'next/server';
import { getDatabase } from '@/db';
import { getInternalUser } from '@/app/internal-auth';
import { getFamilyDataMode } from '@/lib/family-data-mode';
import { sampleFamilyWorkEvents, type SampleFamilyWorkEvent } from '@/lib/sample-fixtures';
const OFFICIAL_SETTINGS_KEY='family_work_events';const SAMPLE_SETTINGS_KEY='sample_family_work_events_v1';type FamilyWorkEvent=SampleFamilyWorkEvent;
function key(sample:boolean){return sample?SAMPLE_SETTINGS_KEY:OFFICIAL_SETTINGS_KEY;}
async function readEvents(sample:boolean):Promise<FamilyWorkEvent[]>{const row=await getDatabase().prepare('SELECT value FROM app_settings WHERE key=?').bind(key(sample)).first<{value:string}>();if(!row?.value)return sample?sampleFamilyWorkEvents():[];try{const parsed=JSON.parse(row.value);return Array.isArray(parsed)?parsed:[];}catch{return[];}}
export async function GET(){try{const[user,mode]=await Promise.all([getInternalUser(),getFamilyDataMode()]);const sampleMode=mode==='sample';return NextResponse.json({events:await readEvents(sampleMode),canEdit:Boolean(user),sampleMode},{headers:{'Cache-Control':'no-store'}});}catch{return NextResponse.json({events:[],canEdit:false});}}
function approvalOnly(){return NextResponse.json({message:'Việc họ được lưu local. Hãy gửi yêu cầu để quản trị viên duyệt trước khi cập nhật dữ liệu chung.'},{status:409});}
export async function POST(){return approvalOnly();}export async function PUT(){return approvalOnly();}export async function DELETE(){return approvalOnly();}
