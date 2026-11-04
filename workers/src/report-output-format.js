// A fixed schema is reused across periods; never embed record bodies or IDs
// in the schema. Grounding is still checked against the actual input afterward.
export const REPORT_OUTPUT_FORMAT={
 type:'json_schema',
 schema:{
  type:'object',additionalProperties:false,required:['sections'],
  properties:{sections:{type:'array',minItems:1,items:{
   type:'object',additionalProperties:false,
   required:['title','text','recordIds','repeated'],
   properties:{
    title:{type:'string'},text:{type:'string'},
    recordIds:{type:'array',minItems:1,items:{type:'string'}},
    repeated:{type:'boolean'},
   },
  }}},
 },
};
