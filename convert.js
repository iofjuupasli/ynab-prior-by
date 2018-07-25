#!/usr/bin/env node
const _ = require(`lodash/fp`);
const fs = require(`fs`);
const iconv = require(`iconv-lite`);

const getFilePath = () => {
    return process.argv[2];
};

const getFileFromArgs = (path) => {
    const file = fs.readFileSync(path);
    return iconv.decode(file, `win1251`);
};

const parseFile = (rawFile) => {
    const lines = rawFile.split(`\n`);
    const approved = _.pipe(
        _.dropWhile((line) => !line.includes(`Операции по`)),
        _.drop(2),
        _.takeWhile((line) => !line.includes(`Всего по контракту`)),
        _.map((line) => line.split(`;`)),
        _.map(([date, payee,,,,, outflow]) => {
            const diff = parseFloat(outflow.replace(`,`, `.`));
            return {
                date,
                payee: _.trim(payee),
                outflow: diff < 0 ? -diff : 0,
                inflow: diff > 0 ? diff : 0,
            };
        }),
    )(lines);
    const blocked = _.pipe(
        _.dropWhile((line) => !line.includes(`Заблокированные суммы по`)),
        _.drop(2),
        _.takeWhile((line) => line),
        _.map((line) => line.split(`;`)),
        _.map(([date, payee,,, outflow]) => {
            const diff = parseFloat(outflow.replace(`,`, `.`));
            return {
                date,
                payee: _.trim(payee),
                outflow: diff,
                inflow: 0,
            };
        }),
    )(lines);
    return blocked.concat(approved);
};

const escapeCsv = (value) => `"${value.split(`"`).join(`""`)}"`;

const formatToCsv = (parsed) => {
    const output = [
        `Date,Payee,Memo,Outflow,Inflow`,
    ];
    return _.pipe(
        _.map(({date, payee, outflow, inflow}) => [date, escapeCsv(payee), ``, outflow, inflow].join(`,`)),
        _.concat([`Date,Payee,Memo,Outflow,Inflow`]),
        _.join(`\n`),
    )(parsed);
};

const output = (text) => {
    console.log(text);
};

const main = () => {
    output(formatToCsv(parseFile(getFileFromArgs(getFilePath()))));
};

main();
