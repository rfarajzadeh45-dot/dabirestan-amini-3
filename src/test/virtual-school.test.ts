import { describe, expect, it } from 'vitest';
import { autoScore, canEditSubmission, examAvailable, safeExternalUrl, schoolDateTime, submissionState, validateFile, validateTiming } from '@/lib/virtual-school/rules';
import type { ExamQuestion } from '@/lib/virtual-school/types';
describe('virtual school assessment rules',()=>{
 const deadline='2026-11-21T06:00:00Z';
 it('allows an editable submitted assignment before its deadline',()=>{expect(canEditSubmission({allow_edits:true,ends_at:deadline},'submitted',new Date('2026-11-21T05:59:59Z'))).toBe(true);});
 it('does not permit replacing a submission after its deadline',()=>{expect(canEditSubmission({allow_edits:true,ends_at:deadline},'submitted',new Date('2026-11-21T06:00:01Z'))).toBe(false);});
 it('respects the teacher disabling edits',()=>{expect(canEditSubmission({allow_edits:false,ends_at:deadline},'submitted',new Date('2026-11-21T05:59:59Z'))).toBe(false);});
 it('never edits a graded assignment',()=>{expect(canEditSubmission({allow_edits:true,ends_at:deadline},'graded',new Date('2026-11-21T05:59:59Z'))).toBe(false);});
 it('accepts exams at start and rejects them at the end',()=>{expect(examAvailable('2026-11-21T05:00:00Z',deadline,new Date('2026-11-21T05:00:00Z'))).toBe(true);expect(examAvailable('2026-11-21T05:00:00Z',deadline,new Date(deadline))).toBe(false);});
 it('requires teacher grading for short and descriptive answers',()=>{const q:ExamQuestion[]=[{id:'1',activity_id:'a',type:'choice',prompt:'one',options:['a','b'],correct_answer:'b',points:5,sort_order:0,image_url:''},{id:'2',activity_id:'a',type:'written',prompt:'two',options:[],correct_answer:'',points:15,sort_order:1,image_url:''}];expect(autoScore(q,{'1':'b','2':'anything'})).toEqual({score:5,manual:true});});
 it('marks missing homework overdue without changing a graded result',()=>{expect(submissionState(deadline,undefined,new Date('2026-11-21T07:00:00Z'))).toBe('overdue');expect(submissionState(deadline,{status:'graded'},new Date('2026-11-21T07:00:00Z'))).toBe('graded');});
});
describe('virtual school files and timing',()=>{
 it('rejects executable file types',()=>{expect(()=>validateFile({size:123,type:'application/x-executable'})).toThrow();});
 it('accepts supported pdf within 20 megabytes',()=>{expect(()=>validateFile({size:20*1024*1024,type:'application/pdf'})).not.toThrow();});
 it('rejects files above 20 megabytes',()=>{expect(()=>validateFile({size:20*1024*1024+1,type:'application/pdf'})).toThrow();});
 it('rejects javascript meeting links and credential-bearing URLs',()=>{expect(()=>safeExternalUrl('javascript:alert(1)')).toThrow();expect(()=>safeExternalUrl('https://user:pass@example.com')).toThrow();});
 it('accepts genuine https provider links',()=>{expect(safeExternalUrl('https://meet.example.com/class')).toBe('https://meet.example.com/class');});
 it('stores Tehran local times as Gregorian UTC instants',()=>{expect(schoolDateTime('2026-11-21','08:30')).toBe('2026-11-21T05:00:00.000Z');});
 it('rejects end times preceding start times',()=>{expect(()=>validateTiming('2026-11-21T06:00:00Z','2026-11-21T05:00:00Z')).toThrow();});
});
