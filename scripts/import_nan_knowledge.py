from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
TAT_PROVINCE = "https://thai.tourismthailand.org/Destinations/Provinces/%E0%B8%99%E0%B9%88%E0%B8%B2%E0%B8%99/108"
TAT_MUST = "https://thai.tourismthailand.org/Articles/5-must-do-in-nan"

SOURCES = [
    ("tat-province", "จังหวัดน่าน", TAT_PROVINCE, "การท่องเที่ยวแห่งประเทศไทย", "official_web"),
    ("tat-must", "5 Must Do in Nan", TAT_MUST, "การท่องเที่ยวแห่งประเทศไทย", "official_article"),
    ("tat-api", "TAT Data API", "https://tatdataapi.io/", "การท่องเที่ยวแห่งประเทศไทย", "official_api"),
    ("tat-nan", "ททท. สำนักงานน่าน", "https://www.facebook.com/tat.nan.office/", "การท่องเที่ยวแห่งประเทศไทย", "official_social"),
    ("mots-nan", "สำนักงานการท่องเที่ยวและกีฬาจังหวัดน่าน", "https://nan.mots.go.th/", "กระทรวงการท่องเที่ยวและกีฬา", "official_web"),
    ("gdc-stats", "สรุปสถานการณ์การท่องเที่ยวจังหวัดน่าน", "https://gdcatalog.go.th/dataset/gdpublish-dataset-40-0111", "Government Data Catalog", "government_dataset"),
    ("gdc-calendar", "ปฏิทินการท่องเที่ยวประจำปีจังหวัดน่าน", "https://gdcatalog.go.th/dataset/gdpublish-40-021", "Government Data Catalog", "government_dataset"),
    ("osm", "OpenStreetMap Nominatim", "https://nominatim.openstreetmap.org/", "OpenStreetMap contributors", "geospatial"),
    ("dmr-soil", "เสาดินนาน้อย", "https://www.dmr.go.th/%E0%B9%80%E0%B8%82%E0%B8%B2%E0%B8%94%E0%B8%B4%E0%B8%99/", "กรมทรัพยากรธรณี", "official_web"),
    ("sac-bo-kluea", "บ้านบ่อหลวง", "https://wikicommunity.sac.or.th/community/1269", "ศูนย์มานุษยวิทยาสิรินธร", "community_knowledge"),
]


def e(id_, labels, name, description, category, lat=None, lon=None, **extra):
    properties = {"themes": [category], "language": "th", "curation_status": "verified", **extra}
    return (id_, labels, name, description, lat, lon, properties)


ENTITIES = [
    e("place-wat-phumin", ["Place", "Temple", "Story"], "วัดภูมินทร์", "วัดทรงจัตุรมุขและแหล่งจิตรกรรมปู่ม่านย่าม่าน หรือภาพกระซิบรักบันลือโลก", "culture", 18.7742425, 100.7716392),
    e("place-nan-museum", ["Place", "Museum"], "พิพิธภัณฑสถานแห่งชาติ น่าน", "อดีตหอคำและแหล่งจัดแสดงศิลปวัตถุ ประวัติศาสตร์ และวัฒนธรรมเมืองน่าน", "history", 18.7762197, 100.7707321),
    e("place-chang-kham", ["Place", "Temple"], "วัดพระธาตุช้างค้ำวรวิหาร", "ปูชนียสถานสำคัญในเขตเมืองเก่าน่าน", "culture", 18.7766832, 100.7720312),
    e("place-khao-noi", ["Place", "Temple", "Viewpoint"], "วัดพระธาตุเขาน้อย", "วัดบนเนินเขาทางตะวันตกของเมือง มองเห็นตัวเมืองน่าน", "culture", 18.7695583, 100.7505369),
    e("place-chae-haeng", ["Place", "Temple", "Community"], "วัดพระธาตุแช่แห้ง", "พระธาตุคู่เมืองน่านและศูนย์กลางประเพณีหกเป็ง", "culture", 18.7585498, 100.7915632),
    e("place-doi-samer-dao", ["Place", "Viewpoint", "Nature"], "ดอยเสมอดาว", "จุดชมทิวทัศน์ 360 องศาในอุทยานแห่งชาติศรีน่าน เหมาะกับการดูดาวและพระอาทิตย์ขึ้น", "nature", 18.3756147, 100.8259873),
    e("place-doi-phu-kha", ["Place", "NationalPark", "Nature"], "อุทยานแห่งชาติดอยภูคา", "พื้นที่ภูเขาและป่าต้นน้ำสำคัญของน่าน เชื่อมโยงชุมชนและความหลากหลายทางชีวภาพ", "nature", 19.1076224, 101.0536168),
    e("place-sao-din", ["Place", "Geology", "Nature"], "เสาดินนาน้อยและคอกเสือ", "ภูมิประเทศจากการผุพังและกัดกร่อนของตะกอนยุคไพลสโตซีน และเป็นแหล่งเรียนรู้ทางธรณีวิทยา", "nature", 18.3037383, 100.7529606),
    e("place-wang-sila-laeng", ["Place", "Geology", "Community"], "วังศิลาแลง", "ซอกผาหินที่ถูกสายน้ำกัดเซาะใกล้ชุมชนศิลาแลง อำเภอปัว", "nature", 19.1371098, 100.9571651),
    e("place-wat-tham-chetawan", ["Place", "Temple"], "วัดถ้ำเชตวัน", "พุทธสถานกลางหุบเขาบ้านเชตวัน ตำบลสันทะ อำเภอนาน้อย", "culture", 18.2727671, 100.5781267),
    e("place-bo-kluea", ["Place", "Community"], "ชุมชนบ่อเกลือ", "ชุมชนภูเขาที่สืบทอดการผลิตเกลือสินเธาว์และพิธีกรรมเจ้าหลวงบ่อ", "community", 19.1259447, 101.1637475),
    e("place-pua", ["Place", "Community", "District"], "อำเภอปัว", "พื้นที่ชุมชนหลากวัฒนธรรม ทุ่งนา งานทอ และวิถีชีวิตใต้ดอยภูคา", "community", 19.1777676, 100.9151926),
    e("place-mani-phruek", ["Place", "Community", "Agrotourism"], "หมู่บ้านมณีพฤกษ์", "ชุมชนบนพื้นที่สูงในตำบลงอบ แหล่งเรียนรู้วิถีม้งและลัวะ กาแฟ และพืชเมืองหนาว", "community", 19.4376296, 101.0697136),
    e("event-boat-racing", ["Event", "Tradition", "Story"], "ประเพณีแข่งเรือน่าน", "ประเพณีที่สะท้อนความผูกพันของชาวน่านกับแม่น้ำน่าน เรือแข่งมีหัวเรือรูปพญานาค", "tradition"),
    e("event-hok-peng", ["Event", "Tradition"], "ประเพณีหกเป็งนมัสการพระธาตุแช่แห้ง", "งานนมัสการพระมหาธาตุแช่แห้งในวันขึ้น 15 ค่ำ เดือน 6 เหนือ", "tradition"),
    e("event-tan-kuai-salak", ["Event", "Tradition"], "ประเพณีตานก๋วยสลาก", "ประเพณีทำบุญอุทิศส่วนกุศลถึงบรรพบุรุษผ่านก๋วยสลาก", "tradition"),
    e("event-paed-peng", ["Event", "Tradition"], "ประเพณีแปดเป็ง วัดจอมแจ้ง", "งานนมัสการพระธาตุจอมแจ้งที่สืบทอดในช่วงเดือนพฤษภาคม", "tradition"),
    e("event-hmong-new-year", ["Event", "Tradition", "Community"], "ปีใหม่ม้ง อำเภอปัว", "งานฉลองหลังฤดูเก็บเกี่ยวและพิธีระลึกถึงบรรพบุรุษของชุมชนม้ง", "tradition"),
    e("food-makwaen-chicken", ["Food", "Experience"], "ไก่ทอดมะแขว่น", "อาหารที่ใช้มะแขว่น เครื่องเทศท้องถิ่นที่เชื่อมการฟื้นฟูป่าและรายได้เกษตรกร", "food"),
    e("food-khao-lam", ["Food", "CommunityKnowledge"], "ข้าวหลามเมืองน่าน", "ของหวานพื้นบ้านและภูมิปัญญาการเผาข้าวหลามของชุมชนบ้านสวนตาล", "food"),
    e("food-kaeng-khae", ["Food", "CommunityKnowledge"], "แกงแคไก่", "แกงพื้นเมืองจากผักหลากชนิดและเนื้อสัตว์ สะท้อนความรู้เรื่องพืชอาหาร", "food"),
    e("food-nan-dessert", ["Food", "Experience"], "ของหวานเมืองน่าน", "วัฒนธรรมของหวานและร้านพื้นถิ่นในเมืองน่าน", "food"),
    e("food-fish-larb", ["Food", "CommunityKnowledge"], "ลาบปลาเวียงสา", "อาหารพื้นบ้านของคนอำเภอเวียงสา", "food"),
    e("craft-nan-silver", ["Craft", "CommunityKnowledge"], "เครื่องเงินน่าน", "งานหัตถกรรมทำมือทั้งสายเครื่องเงินท้องถิ่นและเครื่องเงินกลุ่มชาติพันธุ์", "craft"),
    e("craft-nam-lai", ["Craft", "CommunityKnowledge", "Story"], "ผ้าทอลายน้ำไหล", "ภูมิปัญญาการทอด้วยเทคนิคเกาะหรือล้วง ให้ลวดลายพลิ้วคล้ายสายน้ำน่าน", "craft"),
    e("product-nan-coffee", ["Product", "CommunityKnowledge"], "กาแฟน่าน", "กาแฟพื้นที่สูงจากสวนยาหลวง แม่จริม มณีพฤกษ์ และสะเกี้ยง", "agriculture"),
    e("product-nan-cocoa", ["Product", "Experience"], "โกโก้น่าน", "ประสบการณ์แปรรูปโกโก้แบบฟาร์มสู่คาเฟ่ในอำเภอปัว", "agriculture"),
    e("product-makwaen-paste", ["Product", "CommunityKnowledge"], "น้ำพริกมะแขว่น", "ผลิตภัณฑ์อาหารที่ต่อยอดเครื่องเทศมะแขว่นของภาคเหนือ", "food"),
    e("activity-wa-rafting", ["Activity", "Experience", "Nature"], "ล่องแก่งแม่น้ำว้า", "ประสบการณ์ล่องแก่งท่ามกลางป่าริมแม่น้ำว้า โดยต้องตรวจฤดูกาลและความปลอดภัยก่อนเดินทาง", "adventure"),
    e("activity-wa-sup", ["Activity", "Experience", "Community"], "พายซัพบอร์ดแม่น้ำว้า", "กิจกรรมทางน้ำและพักผ่อนในพื้นที่เวียงสา เมืองแห่งสายน้ำ", "adventure"),
    e("activity-pua-paramotor", ["Activity", "Experience"], "พารามอเตอร์ชมทุ่งนาปัว", "ประสบการณ์ชมภูมิทัศน์ทุ่งนาและทะเลหมอกของปัวจากมุมสูง", "adventure"),
    e("event-amazing-nan-marathon", ["Event", "Sport"], "อะเมซิ่ง น่าน มาราธอน", "กิจกรรมวิ่งที่ใช้อัตลักษณ์เรือแข่งน่านและพื้นที่เมืองเก่าเป็นบริบท", "sport", event_status="verify_current_schedule"),
    e("event-nan100", ["Event", "Sport", "Impact"], "น่าน 100 อัลตราเทรล", "กิจกรรมวิ่งเทรลที่เชื่อมชุมชนและการตระหนักถึงการดูแลผืนป่าดอยภูคา", "sport", event_status="verify_current_schedule"),
    e("experience-stories-city", ["Experience", "StarterExperience"], "ฟังเรื่องเมืองน่านผ่านจิตรกรรมและผู้คน", "เริ่มที่เรื่องกระซิบรัก เชื่อมสู่วัดภูมินทร์ พิพิธภัณฑ์ และชุมชนเมืองเก่า", "experience"),
    e("experience-salt-community", ["Experience", "StarterExperience", "Impact"], "เรียนรู้เกลือภูเขากับชุมชนบ่อหลวง", "เรียนรู้ประวัติ พิธีกรรม และการทำเกลือโดยเคารพกติกาชุมชนและคืนคุณค่าสู่เจ้าของความรู้", "experience"),
    e("experience-pua-living-craft", ["Experience", "StarterExperience", "Impact"], "ผืนผ้า ทุ่งนา และชีวิตของปัว", "ติดตามเรื่องผ้าลายน้ำไหล อาหาร และภูมิทัศน์ผ่านผู้คนในชุมชนปัว", "experience"),
    e("dataset-tourism-situation", ["Dataset", "Impact"], "สรุปสถานการณ์การท่องเที่ยวจังหวัดน่าน", "ชุดข้อมูลสถิติภาครัฐสำหรับติดตามนักท่องเที่ยวและรายได้ระดับจังหวัด", "impact"),
    e("dataset-tourism-calendar", ["Dataset", "EventCalendar"], "ปฏิทินการท่องเที่ยวประจำปีจังหวัดน่าน", "ชุดข้อมูลภาครัฐสำหรับตรวจสอบกำหนดการกิจกรรมประจำปี", "events"),
]

RELATIONSHIPS = [
    ("event-hok-peng", "HELD_AT", "place-chae-haeng"),
    ("event-hmong-new-year", "HELD_IN", "place-pua"),
    ("craft-nam-lai", "PRACTICED_IN", "place-pua"),
    ("product-nan-cocoa", "PRODUCED_IN", "place-pua"),
    ("activity-pua-paramotor", "EXPERIENCED_IN", "place-pua"),
    ("event-nan100", "CONNECTED_TO", "place-doi-phu-kha"),
    ("experience-stories-city", "INCLUDES", "place-wat-phumin"),
    ("experience-stories-city", "INCLUDES", "place-nan-museum"),
    ("experience-salt-community", "INCLUDES", "place-bo-kluea"),
    ("experience-pua-living-craft", "INCLUDES", "place-pua"),
    ("experience-pua-living-craft", "INCLUDES", "craft-nam-lai"),
]

LEGACY_SEED_IDS = [
    "attraction-wat-phumin", "attraction-nan-national-museum", "attraction-doi-phu-kha",
    "community-bo-kluea", "heritage-salt-making", "transport-car", "season-cool",
]


async def main() -> None:
    load_dotenv(ROOT / ".env")
    connection = await asyncpg.connect(os.environ["NAN_DATABASE_URL"], timeout=15)
    try:
        async with connection.transaction():
            await connection.execute(
                "delete from nan_graph_entities where id=any($1::text[])", LEGACY_SEED_IDS
            )
            for source in SOURCES:
                await connection.execute(
                    """insert into nan_sources(id,title,url,publisher,source_type) values($1,$2,$3,$4,$5)
                    on conflict(id) do update set title=excluded.title,url=excluded.url,
                    publisher=excluded.publisher,source_type=excluded.source_type,accessed_at=now()""", *source
                )
            for item in ENTITIES:
                id_, labels, name, description, lat, lon, properties = item
                properties["source_urls"] = [TAT_MUST]
                if lat is not None:
                    properties["gps_source"] = "OpenStreetMap Nominatim; WGS84"
                await connection.execute(
                    """insert into nan_graph_entities
                    (id,labels,name_th,name_en,description,latitude,longitude,visibility,properties,updated_at)
                    values($1,$2,$3,null,$4,$5,$6,'public',$7::jsonb,now()) on conflict(id) do update set
                    labels=excluded.labels,name_th=excluded.name_th,description=excluded.description,
                    latitude=excluded.latitude,longitude=excluded.longitude,properties=excluded.properties,updated_at=now()""",
                    id_, labels, name, description, lat, lon, json.dumps(properties, ensure_ascii=False),
                )
                await connection.execute(
                    """insert into nan_entity_sources(entity_id,source_id,role) values($1,'tat-must','content')
                    on conflict do nothing""", id_
                )
                if lat is not None:
                    await connection.execute(
                        """insert into nan_entity_sources(entity_id,source_id,role) values($1,'osm','coordinates')
                        on conflict do nothing""", id_
                    )
            for entity_id in ("place-wat-phumin", "place-nan-museum", "place-chang-kham", "place-khao-noi", "place-chae-haeng", "place-doi-samer-dao", "place-doi-phu-kha", "place-sao-din", "place-wang-sila-laeng", "place-pua", "place-bo-kluea"):
                await connection.execute(
                    "insert into nan_entity_sources values($1,'tat-province','content') on conflict do nothing", entity_id
                )
            await connection.execute(
                "insert into nan_entity_sources values('place-sao-din','dmr-soil','content') on conflict do nothing"
            )
            await connection.execute(
                "insert into nan_entity_sources values('place-bo-kluea','sac-bo-kluea','community_context') on conflict do nothing"
            )
            await connection.execute(
                "insert into nan_entity_sources values('dataset-tourism-situation','gdc-stats','dataset') on conflict do nothing"
            )
            await connection.execute(
                "insert into nan_entity_sources values('dataset-tourism-calendar','gdc-calendar','dataset') on conflict do nothing"
            )
            for source, rel_type, target in RELATIONSHIPS:
                await connection.execute(
                    """insert into nan_graph_relationships(source_id,type,target_id,properties)
                    values($1,$2,$3,'{}') on conflict(source_id,type,target_id) do nothing""", source, rel_type, target
                )
        count = await connection.fetchval("select count(*) from nan_graph_entities")
        cited = await connection.fetchval("select count(distinct entity_id) from nan_entity_sources")
        located = await connection.fetchval("select count(*) from nan_graph_entities where latitude is not null")
        print(f"Imported {count} entities; {cited} cited; {located} GPS-located")
    finally:
        await connection.close()


if __name__ == "__main__":
    asyncio.run(main())
