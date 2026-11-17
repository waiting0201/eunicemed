using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EuniceMed.Api.Data.Migrations
{
    /// <summary>
    /// 把首頁／About／Products 的定稿文案填進 2026-11-17 開放的後台欄位（docs/15 §14.3）。
    ///
    /// <para>
    /// 前台在欄位空著時本來就顯示程式碼裡的定稿（<c>copyText()</c> 的 fallback），
    /// 所以這支不跑畫面也不會變 —— 它是讓**後台看得到現在顯示的字**，編輯者不必整段重打。
    /// </para>
    ///
    /// <para>
    /// ⚠️ 這裡的文字是 2026-11-17 各頁 <c>COPY</c> 的**快照**，之後改 <c>COPY</c> 不會回頭影響這支。
    /// 規則與限制：
    /// <list type="bullet">
    /// <item><b>只填空欄位</b>（缺鍵、空字串、空白、空陣列）。已有值一律不動，所以重跑或對已手動填過的庫都安全。</item>
    /// <item>migration 在區段同步器<b>之前</b>跑（Program.cs），新區段的 <c>PageSections</c> 列可能還不存在 → 這裡自己建；
    ///       同步器之後看到已存在就不會動它。</item>
    /// <item>有 <c>required</c> 的區段（milestones／manufacturing／certificates）<b>不新建語系列</b> ——
    ///       只有標題的列存不過 schema 驗證，後台會卡住。沒有那一列時前台照樣顯示定稿。</item>
    /// <item>欄位名刻意不是 <c>title</c>／<c>lead</c>：DB 裡還躺著 8 月以前的舊值（docs/15 §14.2）。</item>
    /// </list>
    /// </para>
    /// </summary>
    public partial class BackfillPageCopy : Migration
    {
        private static readonly HashSet<string> HasRequired =
            ["about.milestones", "about.manufacturing", "about.certificates"];

        /// <summary>pageKey → sectionKey → locale → 欄位。由 COPY 產生，形狀與 Api/PageSchemas 一致。</summary>
        private const string Plan = """
        {
          "home": {
            "intro": {
              "en": {
                "kicker": "EuniceMed · Taiwan-Made Medical Braces & Compression Stockings",
                "heading": "Support Feels **Personal**.",
                "intro": "EuniceMed is a premium Taiwan-made medical braces brand by Comfort Plus Corporation, designing orthopedic braces, medical compression stockings and silicone footcare — combining clinical expertise, lasting comfort and dependable quality."
              },
              "zh-TW": {
                "kicker": "EuniceMed 康譜｜台灣製醫療護具與壓力襪",
                "heading": "Support Feels **Personal**.",
                "intro": "EuniceMed 康譜是康譜企業（Comfort Plus）旗下的台灣製高階醫療護具品牌，專注設計骨科護具、醫療壓力襪與矽膠足部照護產品，融合臨床專業，帶來持久的舒適與可靠的品質。"
              }
            },
            "featuredProducts": {
              "en": {
                "heading": "Hero Products",
                "subheading": "Solutions Designed Around Real Life. All in One Premium Promise.",
                "intro": "From knee braces and ankle braces to medical compression stockings and orthotic insoles, every EuniceMed support is designed for precision, all-day comfort and long-term reliability."
              },
              "zh-TW": {
                "heading": "明星商品",
                "subheading": "從日常生活出發的支撐方案。All in One Premium Promise.",
                "intro": "從護膝、護踝，到醫療壓力襪與機能鞋墊，每一件 EuniceMed 產品，都為精準支撐、全天舒適與長久可靠而設計。"
              }
            },
            "bodyPartBand": {
              "en": {
                "heading": "Find Support by Body Part",
                "headingLine2": "& Care Need",
                "intro": "Tap where it hurts or tires — knee, ankle & foot, back & waist — or explore home care, long-term care and post-surgery rehabilitation solutions.",
                "ctaLabel": "Explore applications →",
                "tileCopy": [
                  {
                    "title": "Knee",
                    "subtitle": "Knee braces for sports & stability"
                  },
                  {
                    "title": "Ankle & Foot",
                    "subtitle": "Ankle braces, insoles & plantar support"
                  },
                  {
                    "title": "Back & Waist",
                    "subtitle": "Lumbar support & posture"
                  },
                  {
                    "title": "Special care",
                    "subtitle": "Elderly care · bunion · post-op"
                  }
                ]
              },
              "zh-TW": {
                "heading": "依部位與照護需求，",
                "headingLine2": "找到合適的支撐",
                "intro": "請點選感到痠痛或疲憊的部位：膝部、足踝、腰背；也可依居家照護、長期照護與術後復健，查詢合適的照護方案。",
                "ctaLabel": "查看應用方案 →",
                "tileCopy": [
                  {
                    "title": "膝部",
                    "subtitle": "運動與穩定用護膝"
                  },
                  {
                    "title": "足踝",
                    "subtitle": "護踝、鞋墊與足底支撐"
                  },
                  {
                    "title": "腰背",
                    "subtitle": "腰部支撐與姿勢"
                  },
                  {
                    "title": "特殊照護",
                    "subtitle": "長者照護・拇趾外翻・術後"
                  }
                ]
              }
            },
            "partner": {
              "en": {
                "heading": "A Taiwan OEM/ODM Partner Your Business Can Count On",
                "intro": "Founded in 2008, Comfort Plus Corporation — the maker of EuniceMed — is an ISO 13485 certified Taiwan medical device manufacturer working with distributors in 18 countries.",
                "items": [
                  {
                    "title": "Certified quality",
                    "body": "ISO 13485 system with CE marked and FDA registered product lines."
                  },
                  {
                    "title": "OEM / ODM flexibility",
                    "body": "Private label, OEM and ODM — from design and sampling to certification support."
                  },
                  {
                    "title": "Made in Taiwan",
                    "body": "In-house manufacturing, 11 dedicated QC staff and full traceability."
                  },
                  {
                    "title": "Comfort-first R&D",
                    "body": "Premium materials engineered for all-day wear."
                  }
                ],
                "ctaLabel": "Become a partner"
              },
              "zh-TW": {
                "heading": "值得您信賴的台灣 OEM／ODM 夥伴",
                "intro": "EuniceMed 由康譜企業製造。康譜企業成立於 2008 年，是通過 ISO 13485 認證的台灣醫療器材製造商，目前與 18 國經銷商合作。",
                "items": [
                  {
                    "title": "品質認證",
                    "body": "ISO 13485 品質系統，產品線具 CE 標誌，並完成美國 FDA 登錄。"
                  },
                  {
                    "title": "OEM／ODM 彈性",
                    "body": "貼牌、OEM 與 ODM 皆可承接，從設計、打樣到認證協助。"
                  },
                  {
                    "title": "台灣製造",
                    "body": "自有工廠生產，11 位專職品管，全程可追溯。"
                  },
                  {
                    "title": "舒適優先的研發",
                    "body": "嚴選材料，專為全天穿戴而設計。"
                  }
                ],
                "ctaLabel": "成為合作夥伴"
              }
            },
            "news": {
              "en": {
                "heading": "Latest News",
                "allLabel": "All news →",
                "readLabel": "Read →"
              },
              "zh-TW": {
                "heading": "最新消息",
                "allLabel": "所有消息 →",
                "readLabel": "閱讀全文 →"
              }
            },
            "seo": {
              "en": {
                "title": "Orthopedic Braces & Compression Stockings | EuniceMed",
                "description": "Premium Taiwan-made orthopedic braces, compression stockings and footcare by Comfort Plus Corporation. ISO 13485, CE marked, FDA registered. OEM/ODM."
              },
              "zh-TW": {
                "title": "台灣製骨科護具與醫療壓力襪｜EuniceMed 康譜",
                "description": "EuniceMed 康譜是康譜企業的台灣製高階護具品牌，提供骨科護具、醫療壓力襪與足部照護，通過 ISO 13485 與 CE 認證，並完成美國 FDA 登錄。"
              }
            }
          },
          "about": {
            "hero": {
              "en": {
                "kicker": "About EuniceMed",
                "heading": "Thoughtfully Crafted Medical Supports,",
                "headingLine2": "Made in Taiwan",
                "intro": "Backed by Comfort Plus Corporation, an ISO 13485 certified Taiwan medical device manufacturer since 2008, EuniceMed delivers clinically trusted, comfort-first medical supports — with the flexibility, service and precision your patients and business deserve."
              },
              "zh-TW": {
                "kicker": "關於 EuniceMed 康譜",
                "heading": "用心製作的醫療護具，",
                "headingLine2": "台灣製造",
                "intro": "EuniceMed 康譜的母公司康譜企業，是 2008 年成立、通過 ISO 13485 認證的台灣醫療器材製造商。我們提供臨床信賴、舒適優先的醫療護具，也為您的病患與事業，帶來應有的彈性、服務與精準。"
              }
            },
            "milestones": {
              "en": {
                "heading": "Steady Growth Since 2008"
              },
              "zh-TW": {
                "heading": "2008 年至今，穩健成長"
              }
            },
            "coreValues": {
              "en": {
                "heading": "Support feels ",
                "accent": "personal",
                "intro": "Everything we do is underpinned by three commitments — and you can feel them in the details.",
                "items": [
                  {
                    "title": "Excellence",
                    "body": "Every product begins with a clear goal: real comfort and performance, without compromise. Excellence isn't just what we make — it's how we work."
                  },
                  {
                    "title": "Care",
                    "body": "Comfort-first design that supports movement rather than limiting it — because reassurance matters as much as function."
                  },
                  {
                    "title": "Partnership",
                    "body": "A dependable, service-first specialist — expert hands, caring hearts and lasting partnerships with professionals and distributors in 18 countries."
                  }
                ]
              },
              "zh-TW": {
                "heading": "Support Feels ",
                "accent": "Personal",
                "intro": "我們所做的一切，都源自三項承諾，在每一處細節中都能感受。",
                "items": [
                  {
                    "title": "卓越",
                    "body": "每件產品都從明確的目標出發：真正的舒適與表現，絕不妥協。卓越，不只體現在產品，也體現在我們做事的方式。"
                  },
                  {
                    "title": "照護",
                    "body": "以舒適為先的設計，讓身體活動自如、不受拘束；因為安心與功能同樣重要。"
                  },
                  {
                    "title": "夥伴",
                    "body": "可靠、以服務為先的專業團隊。專業的雙手、溫暖的用心，與 18 國的醫療專業人員及經銷商長期合作。"
                  }
                ]
              }
            },
            "manufacturing": {
              "en": {
                "heading": "Manufacturing & Quality Excellence",
                "intro": "Every EuniceMed brace and compression stocking is made in Taiwan and checked by 11 dedicated QC staff at every stage."
              },
              "zh-TW": {
                "heading": "製造與品質優勢",
                "intro": "每一件 EuniceMed 護具與壓力襪都在台灣製造，並由 11 位專職品管在每個環節把關。"
              }
            },
            "certificates": {
              "en": {
                "heading": "Certified, Audited, Trusted",
                "intro": "Every EuniceMed product line is manufactured under an ISO 13485 quality system and independently certified for its market — CE marked for Europe and FDA registered for the United States.",
                "ctaLabel": "Download certificates →"
              },
              "zh-TW": {
                "heading": "通過認證、稽核，值得信賴",
                "intro": "EuniceMed 產品在 ISO 13485 品質系統下製造，並依各市場規範取得認證：歐盟 CE 標誌、美國 FDA 登錄。",
                "ctaLabel": "下載認證文件 →"
              }
            },
            "seo": {
              "en": {
                "title": "ISO 13485 Taiwan Medical Device Manufacturer | EuniceMed",
                "description": "Founded in 2008, Comfort Plus Corporation makes EuniceMed braces and compression stockings in Taiwan: ISO 13485, CE marked, FDA registered, 11 QC staff."
              },
              "zh-TW": {
                "title": "關於康譜｜ISO 13485 台灣醫療器材製造商",
                "description": "康譜企業成立於 2008 年，在台灣製造 EuniceMed 護具與壓力襪：ISO 13485 品質系統、CE 認證、美國 FDA 登錄，11 位專職品管。"
              }
            }
          },
          "products": {
            "hero": {
              "en": {
                "kicker": "Products · Three Specialist Ranges",
                "heading": "Orthopedic Braces, Compression Stockings & Footcare",
                "intro": "Specialists in smart support: medical compression stockings, orthopedic braces and silicone footcare — every product graded Care · Protect · Advance and made in Taiwan."
              },
              "zh-TW": {
                "kicker": "產品｜三大專業系列",
                "heading": "骨科護具、醫療彈性襪與足部照護",
                "intro": "我們專精於精準支撐：醫療彈性襪、骨科護具與矽膠足部照護。每件產品都依 Care・Protect・Advance 分級，並在台灣製造。"
              }
            },
            "cta": {
              "en": {
                "heading": "Not sure which brace or compression level you need?",
                "bodyText": "Explore by body part on our interactive map, or ask our team for a recommendation.",
                "primaryLabel": "Find by body part",
                "secondaryLabel": "Contact us"
              },
              "zh-TW": {
                "heading": "不確定該選哪款護具或哪個壓力等級？",
                "bodyText": "歡迎透過互動人體圖依部位查詢，或由我們的團隊為您推薦。",
                "primaryLabel": "依部位查詢",
                "secondaryLabel": "聯絡我們"
              }
            },
            "seo": {
              "en": {
                "title": "Knee, Ankle & Back Braces, Compression Stockings | EuniceMed",
                "description": "Explore EuniceMed knee, ankle and back braces, medical compression stockings and orthotic insoles, all made in Taiwan and graded Care, Protect and Advance."
              },
              "zh-TW": {
                "title": "護膝・護踝・護腰與醫療彈性襪｜EuniceMed 康譜",
                "description": "EuniceMed 康譜提供護膝、護踝、護腰等骨科護具，一到三級康譜壓力襪（含靜脈曲張襪、褲襪款），以及矽膠鞋墊，全系列台灣製造。"
              }
            }
          }
        }
        """;

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var plan = JsonNode.Parse(Plan)!.AsObject();

            foreach (var (pageKey, sections) in plan)
            foreach (var (sectionKey, locales) in sections!.AsObject())
            {
                var page = Str(pageKey);
                var section = Str(sectionKey);

                migrationBuilder.Sql($"""
                    INSERT INTO PageSections (Id, PageId, SectionKey, SchemaVersion, IsEnabled, SortOrder, UpdatedAt)
                    SELECT NEWID(), p.Id, {section}, 1, 1, 100, SYSUTCDATETIME()
                    FROM Pages p
                    WHERE p.[Key] = {page}
                      AND NOT EXISTS (SELECT 1 FROM PageSections s WHERE s.PageId = p.Id AND s.SectionKey = {section});
                    """);

                foreach (var (locale, fields) in locales!.AsObject())
                {
                    // Locale 是 varchar，不加 N 前綴（CLAUDE.md §5.3）
                    var loc = $"'{locale.Replace("'", "''")}'";
                    var where = $"""
                        FROM PageSectionTranslations t
                        JOIN PageSections s ON s.Id = t.PageSectionId
                        JOIN Pages p ON p.Id = s.PageId
                        WHERE p.[Key] = {page} AND s.SectionKey = {section} AND t.Locale = {loc}
                        """;

                    if (!HasRequired.Contains($"{pageKey}.{sectionKey}"))
                        migrationBuilder.Sql($"""
                            INSERT INTO PageSectionTranslations (Id, PageSectionId, Locale, DataJson)
                            SELECT NEWID(), s.Id, {loc}, {EmptyObject}
                            FROM PageSections s JOIN Pages p ON p.Id = s.PageId
                            WHERE p.[Key] = {page} AND s.SectionKey = {section}
                              AND NOT EXISTS (SELECT 1 FROM PageSectionTranslations t
                                              WHERE t.PageSectionId = s.Id AND t.Locale = {loc});
                            """);

                    foreach (var (field, value) in fields!.AsObject())
                    {
                        var path = $"'$.{field}'";
                        var json = value!.ToJsonString(new JsonSerializerOptions { WriteIndented = false });

                        migrationBuilder.Sql(value is JsonArray
                            ? $"""
                                UPDATE t SET DataJson = JSON_MODIFY(t.DataJson, {path}, JSON_QUERY({Str(json)}))
                                {where}
                                  AND ISNULL(JSON_QUERY(t.DataJson, {path}), '[]') = '[]';
                                """
                            : $"""
                                UPDATE t SET DataJson = JSON_MODIFY(t.DataJson, {path}, {Str(value.GetValue<string>())})
                                {where}
                                  AND NULLIF(LTRIM(RTRIM(JSON_VALUE(t.DataJson, {path}))), N'') IS NULL;
                                """);
                    }
                }
            }
        }

        /// <summary>純資料回填，不回滾：Down 若清掉欄位，會連編輯者後來改過的字一起清。</summary>
        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }

        private const string EmptyObject = "N'{}'";

        private static string Str(string s) => $"N'{s.Replace("'", "''")}'";
    }
}
