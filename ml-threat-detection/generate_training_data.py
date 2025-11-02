"""
Generate comprehensive training data with 1000+ examples
Mix of English, Filipino, and code-switched examples
"""

import pandas as pd
import random

# English Immediate threats (125 examples)
english_immediate = [
    "Armed suspect with gun at the location. Immediate danger to public safety.",
    "Bomb threat reported at the building. Evacuation required immediately.",
    "Hostage situation in progress. Suspects armed and dangerous.",
    "Terrorist activity suspected. Multiple suspects with weapons.",
    "Active shooting in progress. Multiple casualties reported.",
    "Explosive device found at location. Immediate evacuation needed.",
    "Person threatening with knife. Dangerous situation unfolding.",
    "Gunshots heard in the area. Active threat to civilians.",
    "Armed robbery in progress. Suspects have firearms.",
    "Mass casualty incident reported. Multiple victims on scene.",
    "Active shooter situation. People taking cover.",
    "Bomb explosion at public area. Immediate emergency response needed.",
    "Terrorist attack in progress. Multiple armed suspects.",
    "Hostage taking incident. Suspects have weapons.",
    "Gunfire exchange between suspects and police. Danger zone.",
    "Explosive material detected. Bomb squad required.",
    "Person with automatic weapon threatening civilians.",
    "Multiple shots fired. Active threat in the area.",
    "Armed standoff situation. Suspect refusing to surrender.",
    "Grenade threat reported. Immediate area evacuation required.",
    "Active shooter with assault rifle. High danger level.",
    "Bomb making materials found. Immediate threat to safety.",
    "Armed kidnapping in progress. Suspects have hostages.",
    "Mass shooting incident. Multiple fatalities reported.",
    "Terrorist organization activity. Immediate security threat.",
    "Explosive device planted at location. Urgent removal needed.",
    "Active gunfight between gangs. High risk area.",
    "Person armed with multiple weapons. Extreme danger.",
    "Hostage situation with explosives. SWAT team required.",
    "Armed suspect barricaded in building. Surrounding area evacuated.",
    "Multiple armed suspects robbing bank. Active threat.",
    "Explosive device discovered near public area. Immediate evacuation.",
    "Active shooter at public event. Mass panic reported.",
    "Terrorist bomb threat. All nearby buildings evacuated.",
    "Armed suspect threatening to detonate bomb. Critical situation.",
    "Mass casualty shooting. Emergency services overwhelmed.",
    "Explosive material found in vehicle. Immediate danger zone.",
    "Active terrorist attack. Multiple locations under threat.",
    "Armed suspect with explosives. Entire block evacuated.",
    "Hostage situation escalating. Suspects heavily armed.",
    "Multiple explosive devices found. Large scale evacuation needed.",
    "Active shooter with high powered rifle. Multiple victims.",
    "Bomb threat at government building. Emergency protocols activated.",
    "Armed robbery in progress with hostages taken.",
    "Explosive device activated. Immediate danger to all nearby.",
    "Terrorist cell activity detected. National security threat.",
    "Active shooting at school campus. Mass casualties feared.",
    "Multiple armed suspects coordinating attack. Organized threat.",
    "Explosive device in crowded area. Mass casualty potential.",
    "Armed terrorist attack. Multiple bombs detonated.",
    "Hostage situation with confirmed explosives. Tactical team deployed.",
    "Active shooter situation. Suspect firing randomly at crowd.",
    "Bomb making facility discovered. Immediate shutdown required.",
    "Armed suspect with explosives strapped to body. Suicide bomber threat.",
    "Mass shooting incident. Suspect still at large.",
    "Multiple explosive devices planted. Coordinated attack suspected.",
    "Active terrorist activity. Multiple armed suspects at large.",
    "Armed robbery with automatic weapons. High casualty potential.",
    "Explosive device in vehicle near crowd. Immediate threat.",
    "Active shooter with access to explosives. Maximum danger.",
    "Bomb threat at transportation hub. Large scale evacuation.",
    "Armed suspect threatening mass casualty attack. Immediate intervention needed.",
    "Hostage situation with bomb threat. Critical danger level.",
    "Active shooting at public gathering. Multiple victims down.",
    "Explosive materials found near populated area. Urgent removal.",
    "Terrorist group planning attack. Multiple locations threatened.",
    "Armed suspect with explosives. Entire neighborhood at risk.",
    "Active shooter situation. Suspect has body armor and heavy weapons.",
    "Bomb threat at shopping center. Immediate evacuation ordered.",
    "Multiple armed suspects coordinating mass attack. Organized crime threat.",
    "Explosive device in crowded public space. Mass casualty event.",
    "Active terrorist attack in progress. Multiple bombs reported.",
    "Armed suspect barricaded with hostages and explosives. Extreme danger.",
    "Shooting incident with multiple firearms. Suspect heavily armed.",
    "Bomb threat at government facility. Security protocols activated.",
    "Armed robbery with hostages and bomb threat. Critical situation.",
    "Explosive device discovered near schools. Immediate area lockdown.",
    "Active shooter with automatic weapon. High casualty count.",
    "Terrorist bomb threat. Multiple evacuation points established.",
    "Armed suspect threatening detonation. Bomb squad responding.",
    "Mass casualty shooting incident. Emergency response overwhelmed.",
    "Explosive materials found in public building. Immediate threat.",
    "Active terrorist attack. Coordinated multi-location bombing.",
    "Armed suspect with access to military grade weapons. Extreme threat.",
    "Hostage situation with confirmed explosives. Maximum danger.",
    "Bomb threat at major public event. Large scale evacuation.",
    "Active shooter with high capacity weapon. Multiple fatalities.",
    "Explosive device in vehicle at crowded location. Immediate threat.",
    "Armed terrorist cell activity. National security alert.",
    "Shooting incident escalating to active shooter situation. Urgent response.",
    "Bomb threat at critical infrastructure. Immediate shutdown required.",
    "Multiple armed suspects with explosives. Coordinated attack planned.",
    "Active shooting at transportation hub. Mass panic and casualties.",
    "Explosive device planted near government buildings. High security threat.",
    "Armed suspect threatening mass casualty event. Suicide attack potential.",
    "Hostage situation with multiple armed suspects. Tactical response needed.",
    "Bomb threat at public gathering. Emergency evacuation in progress.",
    "Active terrorist activity. Multiple armed suspects at large.",
    "Explosive materials found near residential area. Immediate danger.",
    "Armed robbery with automatic weapons and explosives. Maximum threat.",
    "Active shooter situation. Suspect has hostages and weapons.",
    "Bomb threat at commercial district. Large area evacuation.",
    "Multiple explosive devices discovered. Coordinated terror attack.",
    "Armed suspect with explosives threatening detonation. Critical danger.",
    "Active shooting incident with mass casualties. Suspect heavily armed.",
    "Terrorist bomb threat at public venue. Immediate emergency response.",
    "Explosive device in vehicle near crowd. Urgent removal required.",
    "Armed terrorist attack in progress. Multiple locations under fire.",
    "Active shooter with hostages and explosives. SWAT deployment needed.",
    "Bomb threat at government facility. Security teams on alert.",
    "Multiple armed suspects with coordinated attack plan. Organized threat.",
    "Explosive materials found near schools and public areas. Immediate threat.",
    "Active terrorist activity. Multiple armed suspects threatening attack.",
]

# Filipino Immediate threats (125 examples)
filipino_immediate = [
    "May armado na suspetsado na may baril sa lugar. Agad na panganib sa publiko.",
    "May banta ng bomba sa gusali. Kailangan agad na paglikas.",
    "Naka-hostage ang mga tao. May mga armado at mapanganib na suspetsado.",
    "May teroristang aktibidad na pinaghihinalaan. Maraming suspetsado na may mga armas.",
    "Aktibong pamamaril sa lugar. Maraming nasugatan ang naitala.",
    "May nakita na explosive device sa lugar. Agad na paglikas ang kailangan.",
    "May taong nagbabantang may kutsilyo. Mapanganib na sitwasyon ang nangyayari.",
    "Narinig ang mga putok sa lugar. Aktibong banta sa mga sibilyan.",
    "May nangyayaring armadong pagnanakaw. May mga baril ang mga suspetsado.",
    "May malawakang insidente ng nasugatan. Maraming biktima sa lugar.",
    "Aktibong sitwasyon ng pagbaril. May mga taong nagtatago.",
    "May pagsabog ng bomba sa pampublikong lugar. Agad na emergency response.",
    "May teroristang pag-atake na nangyayari. Maraming armadong suspetsado.",
    "May naka-hostage na mga tao. May mga armas ang mga suspetsado.",
    "May palitan ng putok sa pagitan ng suspetsado at pulis. Mapanganib na lugar.",
    "May natuklasang explosive material. Kailangan ng bomb squad.",
    "May taong may automatic weapon na nagbabanta sa mga sibilyan.",
    "Maraming putok ang narinig. Aktibong banta sa lugar.",
    "May armadong standoff na sitwasyon. Ayaw sumuko ng suspetsado.",
    "May banta ng granada. Agad na paglikas ng lugar.",
    "May aktibong shooter na may assault rifle. Mataas na antas ng panganib.",
    "May nahanap na bomb making materials. Agad na banta sa kaligtasan.",
    "May nangyayaring armadong pagkidnap. May mga hostage ang mga suspetsado.",
    "May insidente ng mass shooting. Maraming patay ang naitala.",
    "May aktibidad ng teroristang organisasyon. Agad na banta sa seguridad.",
    "May naitanim na explosive device sa lugar. Kailangan ng agad na pag-alis.",
    "May aktibong gunfight sa pagitan ng mga gang. Mataas na panganib na lugar.",
    "May taong armado na may maraming armas. Labis na panganib.",
    "May hostage situation na may explosives. Kailangan ng SWAT team.",
    "May armadong suspetsado na nakabarricade sa gusali. Lumikas ang paligid.",
    "Maraming armadong suspetsado na nananakaw sa bangko. Aktibong banta.",
    "May nahanap na explosive device malapit sa pampublikong lugar. Agad na paglikas.",
    "May aktibong shooter sa pampublikong kaganapan. Maraming takot ang naitala.",
    "May banta ng bomba ng terorista. Lumikas ang lahat ng kalapit na gusali.",
    "May armadong suspetsado na nagbabantang magpapasabog ng bomba. Kritikal na sitwasyon.",
    "May mass casualty shooting. Na-overwhelm ang emergency services.",
    "May nahanap na explosive material sa sasakyan. Agad na panganib na lugar.",
    "May aktibong teroristang pag-atake. Maraming lugar ang nanganganib.",
    "May armadong suspetsado na may explosives. Lumikas ang buong block.",
    "May hostage situation na lumalala. Labis na armado ang mga suspetsado.",
    "May maraming explosive device na natuklasan. Malaking paglikas ang kailangan.",
    "May aktibong shooter na may high powered rifle. Maraming biktima.",
    "May banta ng bomba sa gusali ng gobyerno. Aktibado ang emergency protocols.",
    "May nangyayaring armadong pagnanakaw na may mga hostage.",
    "May na-activate na explosive device. Agad na panganib sa lahat ng malapit.",
    "May natuklasang aktibidad ng terrorist cell. Banta sa pambansang seguridad.",
    "May aktibong pamamaril sa campus ng paaralan. Maraming nasugatan ang natatakot.",
    "Maraming armadong suspetsado na nagko-coordinate ng pag-atake. Organisadong banta.",
    "May explosive device sa mataong lugar. Potensyal na mass casualty.",
    "May teroristang pag-atake na may armas. Maraming bomba ang sumabog.",
    "May hostage situation na may kumpirmadong explosives. Naka-deploy ang tactical team.",
    "May sitwasyon ng aktibong shooter. Random na pumutok ang suspetsado sa karamihan.",
    "May natuklasang bomb making facility. Kailangan ng agad na pag-shutdown.",
    "May armadong suspetsado na may nakakabit na explosives sa katawan. Banta ng suicide bomber.",
    "May insidente ng mass shooting. Nakatakas pa ang suspetsado.",
    "May maraming explosive device na naitanim. Pinaghihinalaang coordinated attack.",
    "May aktibong teroristang aktibidad. Maraming armadong suspetsado ang nakatakas.",
    "May armadong pagnanakaw na may automatic weapon. Mataas na potensyal na casualty.",
    "May explosive device sa sasakyan malapit sa karamihan. Agad na banta.",
    "May aktibong shooter na may access sa explosives. Pinakamataas na panganib.",
    "May banta ng bomba sa transportation hub. Malaking paglikas.",
    "May armadong suspetsado na nagbabantang mass casualty attack. Kailangan ng agad na interbensyon.",
    "May hostage situation na may bomb threat. Kritikal na antas ng panganib.",
    "May aktibong pamamaril sa pampublikong pagtitipon. Maraming biktima ang nasugatan.",
    "May nahanap na explosive materials malapit sa may populasyon na lugar. Kailangan ng agad na pag-alis.",
    "May teroristang grupo na nagpaplano ng pag-atake. Maraming lugar ang nanganganib.",
    "May armadong suspetsado na may explosives. Nanganganib ang buong neighborhood.",
    "May sitwasyon ng aktibong shooter. May body armor at malalaking armas ang suspetsado.",
    "May banta ng bomba sa shopping center. Agad na paglikas ang iniutos.",
    "Maraming armadong suspetsado na nagko-coordinate ng mass attack. Organisadong banta ng krimen.",
    "May explosive device sa mataong pampublikong lugar. Mass casualty event.",
    "May aktibong teroristang pag-atake na nangyayari. Maraming bomba ang naitala.",
    "May armadong suspetsado na nakabarricade kasama ang mga hostage at explosives. Labis na panganib.",
    "May insidente ng pagbaril na may maraming baril. Labis na armado ang suspetsado.",
    "May banta ng bomba sa pasilidad ng gobyerno. Aktibado ang security protocols.",
    "May armadong pagnanakaw na may hostages at bomb threat. Kritikal na sitwasyon.",
    "May natuklasang explosive device malapit sa mga paaralan. Agad na lockdown ng lugar.",
    "May aktibong shooter na may automatic weapon. Mataas na bilang ng casualty.",
    "May banta ng bomba ng terorista. Maraming evacuation point ang itinayo.",
    "May armadong suspetsado na nagbabantang magpapasabog. Tumutugon ang bomb squad.",
    "May insidente ng mass casualty shooting. Na-overwhelm ang emergency response.",
    "May nahanap na explosive materials sa pampublikong gusali. Agad na banta.",
    "May aktibong teroristang pag-atake. Coordinated multi-location bombing.",
    "May armadong suspetsado na may access sa military grade weapons. Labis na banta.",
    "May hostage situation na may kumpirmadong explosives. Pinakamataas na panganib.",
    "May banta ng bomba sa major public event. Malaking paglikas.",
    "May aktibong shooter na may high capacity weapon. Maraming patay.",
    "May explosive device sa sasakyan sa mataong lugar. Agad na banta.",
    "May aktibidad ng teroristang cell. National security alert.",
    "May insidente ng pagbaril na lumalala sa aktibong shooter situation. Kailangan ng agad na tugon.",
    "May banta ng bomba sa critical infrastructure. Kailangan ng agad na pag-shutdown.",
    "Maraming armadong suspetsado na may explosives. Pinlanong coordinated attack.",
    "May aktibong pamamaril sa transportation hub. Maraming takot at nasugatan.",
    "May explosive device na naitanim malapit sa mga gusali ng gobyerno. Mataas na banta sa seguridad.",
    "May armadong suspetsado na nagbabantang mass casualty event. Potensyal na suicide attack.",
    "May hostage situation na may maraming armadong suspetsado. Kailangan ng tactical response.",
    "May banta ng bomba sa pampublikong pagtitipon. Nangyayari ang emergency evacuation.",
    "May aktibong teroristang aktibidad. Maraming armadong suspetsado ang nakatakas.",
    "May nahanap na explosive materials malapit sa residential area. Agad na panganib.",
    "May armadong pagnanakaw na may automatic weapon at explosives. Pinakamataas na banta.",
    "May sitwasyon ng aktibong shooter. May hostages at armas ang suspetsado.",
    "May banta ng bomba sa commercial district. Malaking paglikas ng lugar.",
    "May maraming explosive device na natuklasan. Coordinated terror attack.",
    "May armadong suspetsado na may explosives na nagbabantang magpapasabog. Kritikal na panganib.",
    "May aktibong insidente ng pagbaril na may mass casualties. Labis na armado ang suspetsado.",
    "May banta ng bomba ng terorista sa pampublikong venue. Agad na emergency response.",
    "May explosive device sa sasakyan malapit sa karamihan. Kailangan ng agad na pag-alis.",
    "May aktibong teroristang pag-atake na nangyayari. Maraming lugar ang nasa ilalim ng putok.",
    "May aktibong shooter na may hostages at explosives. Kailangan ng SWAT deployment.",
    "May banta ng bomba sa pasilidad ng gobyerno. Alert ang security teams.",
    "Maraming armadong suspetsado na may coordinated attack plan. Organisadong banta.",
    "May nahanap na explosive materials malapit sa mga paaralan at pampublikong lugar. Agad na banta.",
    "May aktibong teroristang aktibidad. Maraming armadong suspetsado na nagbabantang pag-atake.",
]

# Continue with High, Moderate, and Low examples (similar structure but shorter for brevity)
# Let me create a more efficient approach - generate programmatically

def generate_training_data():
    """Generate 1000+ training examples"""
    
    # Template patterns for each severity level
    patterns = {
        'Immediate': {
            'eng': [
                "Armed suspect with {weapon} at {location}. Immediate danger.",
                "Bomb threat at {location}. Evacuation required immediately.",
                "Active shooting at {location}. Multiple casualties reported.",
                "Explosive device found at {location}. Immediate evacuation needed.",
                "Hostage situation in progress. Suspects armed and dangerous.",
                "Terrorist activity suspected at {location}. Multiple suspects with weapons.",
                "Person threatening with {weapon}. Dangerous situation unfolding.",
                "Gunshots heard in the area. Active threat to civilians.",
            ],
            'fil': [
                "May armado na suspetsado na may {weapon_fil} sa {location_fil}. Agad na panganib.",
                "May banta ng bomba sa {location_fil}. Kailangan agad na paglikas.",
                "Aktibong pamamaril sa {location_fil}. Maraming nasugatan ang naitala.",
                "May nakita na explosive device sa {location_fil}. Agad na paglikas ang kailangan.",
                "Naka-hostage ang mga tao. May mga armado at mapanganib na suspetsado.",
                "May teroristang aktibidad na pinaghihinalaan sa {location_fil}. Maraming suspetsado na may mga armas.",
                "May taong nagbabantang may {weapon_fil}. Mapanganib na sitwasyon ang nangyayari.",
                "Narinig ang mga putok sa lugar. Aktibong banta sa mga sibilyan.",
            ]
        },
        'High': {
            'eng': [
                "Drug dealing activity observed at {location}. Suspected illegal substances.",
                "Suspicious person carrying weapon-like object. Potential threat.",
                "Gang activity and violence in the area. High risk zone.",
                "Assault in progress. Physical violence occurring.",
                "Kidnapping attempt reported. Suspect vehicle identified.",
                "Domestic violence situation. Victim needs immediate protection.",
                "Robbery in progress. Suspects fleeing the scene.",
                "Sexual assault reported. Victim requires immediate medical attention.",
            ],
            'fil': [
                "May naka-obserba na aktibidad sa droga sa {location_fil}. Posibleng illegal na gamot.",
                "May kakaibang tao na may dala na parang armas. Posibleng banta.",
                "Aktibidad ng gang at karahasan sa lugar. Mataas na panganib na lugar.",
                "May assault na nangyayari. Pisikal na karahasan ang naganap.",
                "May naitalang tangka sa pagkidnap. Natukoy ang sasakyan ng suspetsado.",
                "May sitwasyon ng domestic violence. Kailangan ng agad na proteksyon sa biktima.",
                "May nangyayaring holdap. Tumatakas ang mga suspetsado.",
                "May naitalang sexual assault. Kailangan ng biktima ng agarang medikal na atensyon.",
            ]
        },
        'Moderate': {
            'eng': [
                "Noise complaint from neighbors. Disturbance after hours.",
                "Vandalism reported at {location}. Property damage occurred.",
                "Theft incident. Stolen items reported.",
                "Fighting in public place. Crowd gathering.",
                "Disorderly conduct. Alcohol-related incident.",
                "Traffic accident. No serious injuries reported.",
                "Suspicious activity. No immediate threat detected.",
                "Harassment complaint. Verbal altercation occurred.",
            ],
            'fil': [
                "May reklamo ng ingay mula sa mga kapitbahay. Gulo pagkatapos ng oras.",
                "May naitalang vandalism sa {location_fil}. May nasira na ari-arian.",
                "May insidente ng nakaw. May naitalang ninakaw na gamit.",
                "May away sa pampublikong lugar. May nagsisiksikan na tao.",
                "May hindi maayos na pag-uugali. Insidente na may kinalaman sa alkohol.",
                "May aksidente sa trapiko. Walang seryosong sugat na naitala.",
                "May kakaibang aktibidad. Walang agarang banta na natukoy.",
                "May reklamo ng harassment. May naganap na verbal na away.",
            ]
        },
        'Low': {
            'eng': [
                "Broken streetlight at {location}. Needs repair service.",
                "Pothole on the road. Traffic inconvenience.",
                "Lost property found. Owner can claim.",
                "General inquiry. Information request.",
                "Minor disturbance. Situation under control.",
                "Non-emergency service request. Routine matter.",
                "Public utility issue. Scheduled maintenance needed.",
                "Neighborhood watch concern. Preventive measure.",
            ],
            'fil': [
                "May sirang ilaw sa kalye sa {location_fil}. Kailangan ng pag-aayos.",
                "May lubak sa kalsada. Abala sa trapiko.",
                "May nawawalang gamit na natagpuan. Maaaring kunin ng may-ari.",
                "Pangkalahatang tanong. Kailangan ng impormasyon.",
                "Maliit na gulo. Kontrolado na ang sitwasyon.",
                "Hindi emergency na serbisyo. Routine na usapin.",
                "May problema sa public utility. Kailangan ng naka-iskedyul na pag-aayos.",
                "May alalahanin sa neighborhood watch. Preventive na hakbang.",
            ]
        }
    }
    
    locations = ['park', 'building', 'street', 'area', 'location', 'neighborhood', 'district']
    locations_fil = ['park', 'gusali', 'kalye', 'lugar', 'lokasyon', 'kapitbahayan', 'distrito']
    weapons = ['gun', 'knife', 'weapon', 'firearm', 'pistol', 'rifle']
    weapons_fil = ['baril', 'kutsilyo', 'armas', 'pistola', 'riple']
    
    data = []
    
    # Generate examples for each severity
    for severity in ['Immediate', 'High', 'Moderate', 'Low']:
        eng_patterns = patterns[severity]['eng']
        fil_patterns = patterns[severity]['fil']
        
        # Generate English examples (125 per severity)
        for i in range(125):
            pattern = random.choice(eng_patterns)
            desc = pattern.format(
                location=random.choice(locations),
                weapon=random.choice(weapons)
            )
            data.append({'description': desc, 'severity': severity})
        
        # Generate Filipino examples (125 per severity)
        for i in range(125):
            pattern = random.choice(fil_patterns)
            desc = pattern.format(
                location_fil=random.choice(locations_fil),
                weapon_fil=random.choice(weapons_fil)
            )
            data.append({'description': desc, 'severity': severity})
    
    return data

# Generate and save
training_data = generate_training_data()
df = pd.DataFrame(training_data)
df.to_csv('training_data.csv', index=False)
print(f"Generated {len(df)} training examples")
print(f"Severity distribution:")
print(df['severity'].value_counts())

