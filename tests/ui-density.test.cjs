const test=require('node:test'),assert=require('node:assert/strict');
const {uiFixture,nodes}=require('./helpers/ui-fixture.cjs');

test('record hint uses a transparent first-touch shield, then permits navigation without shifting the tab row',()=>{
 let dismissed=0;const p={recordHint:true,dismissRecordHint(){p.recordHint=false;dismissed++;}};
 const Tabs=Object.assign(function Tabs(){},{Screen:'TabScreen'});
 const ui=uiFixture({'expo-router':{Tabs},'@/features/preparation/provider':{usePreparation:()=>p}});
 const Screen=ui.load('src/app/(tabs)/_layout.tsx').default;
 const routes=['home','record','help','settings'].map(name=>({name,key:name})),navigated=[];
 const props={state:{index:0,routes},descriptors:Object.fromEntries(routes.map(r=>[r.key,{options:{title:r.name}}])),emitter:{emit:()=>({defaultPrevented:false})},navigateToTab:key=>navigated.push(key),insets:{bottom:34}};
 let root=ui.draw(Screen,{}),bar=nodes(root).find(n=>n.type===Tabs).props.tabBar(props);
 const bubble=nodes(bar).find(n=>n.props.accessibilityLiveRegion==='polite');assert.equal(bubble.props.style.position,'absolute');assert.equal(bubble.props.style.bottom,'100%');assert.equal(bar.props.style.backgroundColor,'transparent');
 const tabRow=nodes(bar).find(n=>n.props.style?.paddingBottom===34);
 assert.ok(tabRow);const before=JSON.stringify(tabRow.props.style);
 const shield=nodes(root).find(n=>n.props.accessibilityLabel==='돌봄기록 안내 닫기');assert.ok(shield);assert.equal(shield.props.style.backgroundColor,'transparent');for(const edge of ['top','bottom','left','right'])assert.equal(shield.props.style[edge],0);
 assert.equal(dismissed,0);assert.deepEqual(navigated,[]);shield.props.onPress();assert.equal(dismissed,1);assert.deepEqual(navigated,[]);
 root=ui.draw(Screen,{});bar=nodes(root).find(n=>n.type===Tabs).props.tabBar(props);
 assert.ok(!nodes(bar).some(n=>n.props.accessibilityLiveRegion==='polite'));
 assert.equal(JSON.stringify(nodes(bar).find(n=>n.props.style?.paddingBottom===34).props.style),before);
 assert.ok(!nodes(root).some(n=>n.props.accessibilityLabel==='돌봄기록 안내 닫기'));assert.equal(dismissed,1);
 nodes(bar).find(n=>n.props.accessibilityRole==='tab'&&n.props.accessibilityLabel==='settings').props.onPress();assert.deepEqual(navigated,['settings']);
});
