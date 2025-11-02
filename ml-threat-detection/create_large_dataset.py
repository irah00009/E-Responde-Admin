"""
Create comprehensive training dataset with 1000+ examples
Based on official police classification criteria:
- Immediate: Imminent danger, in-progress serious crimes
- High: Serious crimes already occurred, potential for harm but threat passed
- Moderate: Less severe offenses, no immediate danger
- Low: Minor incidents, ordinance violations, non-emergency
"""

import pandas as pd
import random

def create_large_dataset():
    """Create 1000+ training examples matching official classification criteria"""
    
    data = []
    
    # IMMEDIATE: Imminent danger to life/property, in-progress serious crimes
    immediate_templates = [
        # English - In-progress serious crimes
        "Murder in progress at {l}. Suspect actively harming victim.",
        "Active assault and rape happening at {l}. Victim in immediate danger.",
        "Armed robbery in progress at {l}. Suspects have weapons.",
        "Domestic violence with active threats at {l}. Victim injured and in danger.",
        "Building on fire at {l} with people trapped inside. Immediate rescue needed.",
        "Active shooting at {l}. Suspect firing at people.",
        "Hostage situation at {l}. Armed suspects holding people captive.",
        "Bomb threat at {l}. Explosive device confirmed and active.",
        "Active stabbing incident at {l}. Suspect attacking victims.",
        "Armed standoff at {l}. Suspect threatening to kill hostages.",
        "Gang violence in progress at {l}. Multiple armed suspects fighting.",
        "Active kidnapping in progress at {l}. Victim being taken against will.",
        "Terrorist attack in progress at {l}. Multiple bombs detonating.",
        "Active sexual assault at {l}. Victim needs immediate protection.",
        "Mass casualty incident at {l}. Multiple people injured and dying.",
        "Armed carjacking in progress at {l}. Victim still in vehicle.",
        "Active home invasion at {l}. Armed suspects inside with victims.",
        "Building collapse with people trapped at {l}. Immediate rescue needed.",
        "Active human trafficking operation at {l}. Victims being transported.",
        "Explosive device activated at {l}. Immediate evacuation required.",
        
        # Filipino - In-progress serious crimes
        "May nangyayaring pagpatay sa {lf}. Aktibong sinasaktan ng suspetsado ang biktima.",
        "May nangyayaring assault at rape sa {lf}. Nasa agarang panganib ang biktima.",
        "May nangyayaring armadong pagnanakaw sa {lf}. May mga armas ang mga suspetsado.",
        "May domestic violence na may aktibong banta sa {lf}. Nasugatan at nanganganib ang biktima.",
        "May nasusunog na gusali sa {lf} na may mga taong naipit sa loob. Kailangan ng agad na pagligtas.",
        "May aktibong pamamaril sa {lf}. Pumutok ang suspetsado sa mga tao.",
        "May hostage situation sa {lf}. May armadong suspetsado na naghahawak ng mga tao.",
        "May banta ng bomba sa {lf}. Kumpirmado at aktibo ang explosive device.",
        "May aktibong insidente ng pagsaksak sa {lf}. Umaatake ang suspetsado sa mga biktima.",
        "May armadong standoff sa {lf}. Nagbabantang papatayin ang mga hostage ang suspetsado.",
        "May karahasan ng gang na nangyayari sa {lf}. Maraming armadong suspetsado ang nag-aaway.",
        "May aktibong pagkidnap na nangyayari sa {lf}. Dinadala ang biktima laban sa kanyang kalooban.",
        "May teroristang pag-atake na nangyayari sa {lf}. Maraming bomba ang sumasabog.",
        "May aktibong sexual assault sa {lf}. Kailangan ng biktima ng agarang proteksyon.",
        "May malawakang insidente ng nasugatan sa {lf}. Maraming tao ang nasugatan at namamatay.",
        "May nangyayaring armadong carjacking sa {lf}. Nasa loob pa ng sasakyan ang biktima.",
        "May aktibong home invasion sa {lf}. May mga armadong suspetsado sa loob kasama ang mga biktima.",
        "May gumuho na gusali na may mga taong naipit sa {lf}. Kailangan ng agad na pagligtas.",
        "May aktibong operasyon ng human trafficking sa {lf}. Dinadala ang mga biktima.",
        "May na-activate na explosive device sa {lf}. Kailangan ng agad na paglikas.",
    ]
    
    # HIGH: Serious crimes already occurred, potential for harm but threat passed
    high_templates = [
        # English - Past serious crimes
        "Past murder investigation at {l}. Suspect fled the scene.",
        "Serious assault occurred at {l}. Victim hospitalized, suspect escaped.",
        "Burglary reported at {l}. Suspect fled before police arrival.",
        "Significant property damage at {l}. Extensive vandalism occurred.",
        "Major fraud case at {l}. Large sum of money stolen, investigation needed.",
        "Identity theft incident at {l}. Victim's accounts compromised.",
        "Armed robbery that occurred at {l}. Suspects fled scene with stolen items.",
        "Serious drug trafficking operation discovered at {l}. Large quantity seized.",
        "Gang-related shooting at {l}. Victim died, suspects at large.",
        "Domestic violence case at {l}. Victim hospitalized, suspect fled.",
        "Human trafficking network discovered at {l}. Multiple victims rescued.",
        "Organized crime activity at {l}. Major investigation underway.",
        "Financial fraud scheme at {l}. Multiple victims affected.",
        "Car theft with evidence at {l}. Vehicle stolen, suspect identified.",
        "Arson case at {l}. Building damaged, suspect fled.",
        "Kidnapping case at {l}. Victim rescued, suspects arrested.",
        "Sexual assault case at {l}. Victim receiving medical care.",
        "Large-scale theft at {l}. Significant property stolen.",
        "Major cybercrime incident at {l}. System compromised.",
        "Drug manufacturing facility discovered at {l}. Lab dismantled.",
        
        # Filipino - Past serious crimes
        "May imbestigasyon sa nakaraang pagpatay sa {lf}. Nakatakas ang suspetsado.",
        "May naganap na seryosong assault sa {lf}. Na-hospitalize ang biktima, nakatakas ang suspetsado.",
        "May naiulat na burglary sa {lf}. Nakatakas ang suspetsado bago dumating ang pulis.",
        "May malaking pinsala sa ari-arian sa {lf}. Malawakang vandalism ang naganap.",
        "May malaking kaso ng fraud sa {lf}. Ninakaw ang malaking halaga, kailangan ng imbestigasyon.",
        "May insidente ng identity theft sa {lf}. Nakompromiso ang mga account ng biktima.",
        "May armadong pagnanakaw na naganap sa {lf}. Nakatakas ang mga suspetsado kasama ang ninakaw na gamit.",
        "May natuklasang malaking operasyon ng drug trafficking sa {lf}. Malaking dami ang nakuha.",
        "May pagbaril na may kinalaman sa gang sa {lf}. Namatay ang biktima, nakatakas ang mga suspetsado.",
        "May kaso ng domestic violence sa {lf}. Na-hospitalize ang biktima, nakatakas ang suspetsado.",
        "May natuklasang network ng human trafficking sa {lf}. Maraming biktima ang nailigtas.",
        "May aktibidad ng organized crime sa {lf}. Malaking imbestigasyon ang isinasagawa.",
        "May scheme ng financial fraud sa {lf}. Maraming biktima ang naapektuhan.",
        "May nakaw ng sasakyan na may ebidensya sa {lf}. Ninakaw ang sasakyan, natukoy ang suspetsado.",
        "May kaso ng arson sa {lf}. Nasira ang gusali, nakatakas ang suspetsado.",
        "May kaso ng pagkidnap sa {lf}. Nailigtas ang biktima, naaresto ang mga suspetsado.",
        "May kaso ng sexual assault sa {lf}. Tumanggap ang biktima ng medikal na pangangalaga.",
        "May malakihang nakaw sa {lf}. Malaking ari-arian ang ninakaw.",
        "May malaking insidente ng cybercrime sa {lf}. Nakompromiso ang sistema.",
        "May natuklasang pasilidad ng paggawa ng droga sa {lf}. Natiwang ang laboratoryo.",
    ]
    
    # MODERATE: Less severe offenses, no immediate danger
    moderate_templates = [
        # English - Less severe crimes
        "Theft incident at {l}. Suspect already left, no immediate threat.",
        "Shoplifting case at {l}. Suspect fled store before arrest.",
        "Minor traffic accident at {l}. No injuries reported, vehicles damaged.",
        "Vandalism reported at {l}. Property damaged, suspect unknown.",
        "Cold property crime at {l}. Incident occurred days ago.",
        "Trespassing incident at {l}. Person left before police arrived.",
        "Harassment complaint at {l}. Verbal incident, no physical harm.",
        "Disorderly conduct at {l}. Disturbance resolved, no arrests.",
        "Theft from vehicle at {l}. Items stolen, no suspect on scene.",
        "Breaking and entering at {l}. Suspect fled, no victims present.",
        "Property damage at {l}. Minor destruction occurred.",
        "Noise disturbance at {l}. Loud party, no violence.",
        "Suspicious activity at {l}. No immediate threat detected.",
        "Theft of bicycle at {l}. Stolen days ago, cold case.",
        "Graffiti reported at {l}. Property defaced, suspect unknown.",
        "Vehicle break-in at {l}. Items stolen, suspect already left.",
        "Petty theft at {l}. Small value items stolen.",
        "Public intoxication at {l}. Person removed, no charges.",
        "Disorderly behavior at {l}. Situation resolved peacefully.",
        "Non-violent property crime at {l}. Incident occurred earlier.",
        
        # Filipino - Less severe crimes
        "May insidente ng nakaw sa {lf}. Nakaalis na ang suspetsado, walang agarang banta.",
        "May kaso ng shoplifting sa {lf}. Nakatakas ang suspetsado sa tindahan bago maaresto.",
        "May maliit na aksidente sa trapiko sa {lf}. Walang nasugatan na naiulat, nasira ang mga sasakyan.",
        "May naiulat na vandalism sa {lf}. Nasira ang ari-arian, hindi kilala ang suspetsado.",
        "May cold property crime sa {lf}. Naganap ang insidente ilang araw na ang nakalipas.",
        "May insidente ng trespassing sa {lf}. Umalis ang tao bago dumating ang pulis.",
        "May reklamo ng harassment sa {lf}. Verbal na insidente, walang pisikal na pinsala.",
        "May disorderly conduct sa {lf}. Naresolba ang gulo, walang naaresto.",
        "May nakaw mula sa sasakyan sa {lf}. Ninakaw ang mga gamit, walang suspetsado sa lugar.",
        "May breaking and entering sa {lf}. Nakatakas ang suspetsado, walang biktima.",
        "May pinsala sa ari-arian sa {lf}. Maliit na pinsala ang naganap.",
        "May disturbance ng ingay sa {lf}. Maingay na party, walang karahasan.",
        "May kakaibang aktibidad sa {lf}. Walang agarang banta na natukoy.",
        "May nakaw ng bisikleta sa {lf}. Ninakaw ilang araw na ang nakalipas, cold case.",
        "May naiulat na graffiti sa {lf}. Nasira ang ari-arian, hindi kilala ang suspetsado.",
        "May break-in sa sasakyan sa {lf}. Ninakaw ang mga gamit, nakaalis na ang suspetsado.",
        "May petty theft sa {lf}. Maliit na halagang gamit ang ninakaw.",
        "May public intoxication sa {lf}. Inalis ang tao, walang kaso.",
        "May hindi maayos na pag-uugali sa {lf}. Naresolba ang sitwasyon nang mapayapa.",
        "May non-violent property crime sa {lf}. Naganap ang insidente kanina.",
    ]
    
    # LOW: Minor incidents, ordinance violations, non-emergency
    low_templates = [
        # English - Minor incidents
        "Lost property found at {l}. Owner can claim at station.",
        "Noise complaint at {l}. Loud music from neighbor.",
        "Minor parking violation at {l}. Vehicle parked incorrectly.",
        "General inquiry about past incident at {l}. Information request only.",
        "Found property report at {l}. Item turned in for safekeeping.",
        "Non-emergency report at {l}. Routine documentation needed.",
        "Ordinance violation at {l}. Trash disposal issue.",
        "Lost pet report at {l}. Missing dog or cat.",
        "Abandoned vehicle at {l}. Vehicle left for days.",
        "Public nuisance at {l}. Minor disturbance complaint.",
        "Traffic sign damaged at {l}. Needs repair service.",
        "Streetlight out at {l}. Maintenance request.",
        "Pothole reported at {l}. Road repair needed.",
        "Graffiti cleanup needed at {l}. Property maintenance.",
        "Illegal parking complaint at {l}. Vehicle blocking access.",
        "Neighborhood watch report at {l}. Suspicious but non-threatening.",
        "Request for police report copy at {l}. Administrative service.",
        "Past incident inquiry at {l}. No active investigation.",
        "General information request at {l}. No crime reported.",
        "Routine property check at {l}. Security verification.",
        
        # Filipino - Minor incidents
        "May nawawalang gamit na natagpuan sa {lf}. Maaaring kunin ng may-ari sa istasyon.",
        "May reklamo ng ingay sa {lf}. Maingay na musika mula sa kapitbahay.",
        "May maliit na paglabag sa parking sa {lf}. Mali ang pag-park ng sasakyan.",
        "Pangkalahatang tanong tungkol sa nakaraang insidente sa {lf}. Hiling lang ng impormasyon.",
        "May naiulat na natagpuang gamit sa {lf}. Ibinigay ang gamit para sa pag-iingat.",
        "May hindi emergency na ulat sa {lf}. Routine documentation ang kailangan.",
        "May paglabag sa ordinansya sa {lf}. Problema sa pagtatapon ng basura.",
        "May ulat ng nawawalang alaga sa {lf}. Nawawalang aso o pusa.",
        "May inabandunang sasakyan sa {lf}. Iniwan ang sasakyan ng ilang araw.",
        "May public nuisance sa {lf}. Maliit na reklamo ng disturbance.",
        "May nasira na traffic sign sa {lf}. Kailangan ng pag-aayos.",
        "May walang ilaw na streetlight sa {lf}. Hiling sa maintenance.",
        "May naiulat na lubak sa {lf}. Kailangan ng pag-aayos ng kalsada.",
        "May kailangang cleanup ng graffiti sa {lf}. Pagpapanatili ng ari-arian.",
        "May reklamo ng illegal parking sa {lf}. Nakaharang ang sasakyan.",
        "May ulat ng neighborhood watch sa {lf}. Kakaiba pero hindi nagbabanta.",
        "May hiling para sa kopya ng police report sa {lf}. Administrative service.",
        "May tanong tungkol sa nakaraang insidente sa {lf}. Walang aktibong imbestigasyon.",
        "May pangkalahatang hiling ng impormasyon sa {lf}. Walang naiulat na krimen.",
        "May routine property check sa {lf}. Pagpapatunay ng seguridad.",
    ]
    
    # Variations for locations
    locations_eng = ['park', 'building', 'street', 'area', 'location', 'neighborhood', 'district', 'mall', 'school', 'hospital', 'market', 'church', 'barangay', 'community center', 'residential area', 'commercial district', 'parking lot', 'apartment building']
    locations_fil = ['park', 'gusali', 'kalye', 'lugar', 'lokasyon', 'kapitbahayan', 'distrito', 'mall', 'paaralan', 'ospital', 'palengke', 'simbahan', 'barangay', 'community center', 'residential area', 'commercial district', 'parking lot', 'apartment building']
    
    # Generate examples - 250 per severity level = 1000 total
    severity_templates = {
        'Immediate': (immediate_templates, 250),
        'High': (high_templates, 250),
        'Moderate': (moderate_templates, 250),
        'Low': (low_templates, 250)
    }
    
    for severity, (templates, count) in severity_templates.items():
        # Generate examples with location variations
        for i in range(count):
            template = random.choice(templates)
            desc = template.format(
                l=random.choice(locations_eng),
                lf=random.choice(locations_fil)
            )
            data.append({'description': desc, 'severity': severity})
    
    return data

# Generate dataset
print("Generating 1000+ training examples based on official classification criteria...")
training_data = create_large_dataset()
df = pd.DataFrame(training_data)

# Shuffle for better training
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save to CSV
df.to_csv('training_data.csv', index=False)

print(f"\n✅ Generated {len(df)} training examples")
print(f"\nSeverity distribution:")
print(df['severity'].value_counts())
print(f"\nLanguage breakdown:")
fil_count = df['description'].str.contains('May|na|sa|ang|mga|ng|Naka|Aktibo', case=False, regex=True).sum()
print(f"  Filipino examples: {fil_count}")
print(f"  English examples: {len(df) - fil_count}")
print(f"\nClassification criteria:")
print("  Immediate: In-progress serious crimes, imminent danger")
print("  High: Past serious crimes, potential harm but threat passed")
print("  Moderate: Less severe offenses, no immediate danger")
print("  Low: Minor incidents, ordinance violations, non-emergency")
print(f"\nSaved to: training_data.csv")
