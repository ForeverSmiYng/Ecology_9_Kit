// let originalString = "北京市（市）";
// let encodedString = encodeURIComponent(originalString);

let htmlString = await $.get(`http://xzqh.mca.gov.cn/defaultQuery?shengji=-1&diji=-1&xianji=-1`);
htmlString = htmlString.replace(/(\r\n|\n|\r)+/g, ' ').trim();
let parser = new DOMParser();
let doc = parser.parseFromString(htmlString, "text/html");
let match = /(?<=var\s+json\s*=\s*)\[.*?\](?=\s*;)/gs;
let provinceList = JSON.parse(doc.getElementsByTagName('script')[21].textContent.match(match)[0]);
let baseInfo = JSON.parse(doc.getElementById('pyArr').value);
let res = [];
res = res.concat(pushRes(provinceList.map(e => e.quHuaDaiMa), null, 1));

for (let i = 0; i < provinceList.length; i++) {
    let cityList = await getChildRegion(provinceList[i].quHuaDaiMa);
    if (cityList.length) {
        // 将结果纳入树型数据
        res = res.concat(pushRes(cityList, provinceList[i].quHuaDaiMa, 2));
        for (let j = 0; j < cityList.length; j++) {
            let districtList = await getChildRegion(cityList[j]);
            if (districtList.length) {
                // 将结果纳入树型数据
                res = res.concat(pushRes(districtList, cityList[j], 3));
            } else {
                res.find(e => e.code == cityList[j]).level = 3;
                // 补一个市，与省同名
                if (res.filter(f => f.code == provinceList[i].quHuaDaiMa && f.level == 2).length == 0) {
                    res = res.concat(pushRes([provinceList[i].quHuaDaiMa], provinceList[i].quHuaDaiMa, 2));
                }
            }
        }
    }
}

// 转换为树形结构
let resArr = [];

for (let i = 0; i < 3; i++) {
    if (i == 0) {
        resArr = resArr.concat(res.filter(e => e.level == i + 1));
        continue;
    }
    res.filter(e => e.level == i).forEach(fe => {
        fe.children = res.filter(fl => fl.parentCode == fe.code && fl.level == i + 1);
    });
}
console.log(resArr);

function pushRes(resList, parentCode, level) {
    let res = [];
    resList.forEach(e => {
        let eObj = baseInfo.find(f => f.code == e);
        res.push({
            code: e,
            name: eObj.cName,
            py: eObj.py.match(/[^\s]+/g)[0],
            jp: eObj.jp,
            parentCode: parentCode,
            level: level
        });
    });
    return res;
}

async function getChildRegion(parentRegion) {
    let result = await fetch(`http://xzqh.mca.gov.cn/getInfo?code=${parentRegion}&type=2`)
    let child;
    try {
        child = await result.json();
        return Object.keys(child);
    } catch (error) {
        return [];
    }
}