import {expect,it,vi} from 'vitest'
import {InputPreferencesStore,defaultInputPreferences,inputPreferencesKey,parseInputPreferences} from './preferences'
it('persists/reloads validated versioned preferences only and resets tuning without profile changes',()=>{
 const storage={getItem:vi.fn().mockReturnValue(null),setItem:vi.fn()};const store=new InputPreferencesStore(storage);store.set({mode:'hands',sensitivity:1.5,onboardingCompleted:true});const [key,data]=storage.setItem.mock.calls[0];expect(key).toBe(inputPreferencesKey);expect(Object.keys(JSON.parse(data)).sort()).toEqual(Object.keys(defaultInputPreferences).sort());storage.getItem.mockReturnValue(data);const reload=new InputPreferencesStore(storage);expect(reload.getSnapshot().preferences.sensitivity).toBe(1.5);reload.reset();expect(reload.getSnapshot().preferences).toMatchObject({sensitivity:1,smoothingMs:80,mode:'hands',onboardingCompleted:true})
})
it('rejects malformed/corrupted/out of bounds storage and falls back honestly on denied storage',()=>{
 for(const value of [null,{}, {...defaultInputPreferences,version:2},{...defaultInputPreferences,sensitivity:NaN},{...defaultInputPreferences,sensitivity:2.1},{...defaultInputPreferences,smoothingMs:-1}])expect(parseInputPreferences(value)).toBeNull()
 const bad=new InputPreferencesStore({getItem:()=>'{',setItem:()=>{throw Error('denied')}});expect(bad.getSnapshot()).toMatchObject({preferences:defaultInputPreferences,persistence:'memory'});bad.set({sensitivity:.7});expect(bad.getSnapshot()).toMatchObject({preferences:{sensitivity:.7},persistence:'memory'})
})
it('subscribers observe updates and unsubscribe cleanly; malformed patch cannot overwrite good tuning',()=>{
 const store=new InputPreferencesStore(),listener=vi.fn(),remove=store.subscribe(listener);store.set({sensitivity:1.5});store.set({sensitivity:99});expect(listener).toHaveBeenCalledOnce();expect(store.getSnapshot().preferences.sensitivity).toBe(1.5);remove();store.reset();expect(listener).toHaveBeenCalledOnce()
})
