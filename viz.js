

var dates = []
var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

var scenes = ["<-Prev", "Scene 1", "Scene 2", "Scene 3", "Next->"]

let years = ["<-Prev", 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, "Next->"]
let select_year = 2005

var container = d3.select("#map")
    .attr("width", 1000)
    .attr("height", 500)

var width = 1000
var height = 500

var graph_width = 300
var graph_height = 300

var svg = container.append("svg")
    .attr("width", width)
    .attr("height", height)

var projection = d3.geoAlbersUsa()

var infobar = d3.select(".tooltip")
    .style("opacity", 0)
    .style("width", 480)

var tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)

var path = d3.geoPath()
    .projection(projection)

const perCapita = true;

var color_helper = perCapita
    ? d3.scaleLog([0.001, 0.01, 0.1], ["#7d78ff", "#130be3", "#04006b"])
    : d3.scaleLog([1, 1000, 1000000], ["#7d78ff", "#130be3", "#04006b"]);

function color(num) {
    if (num == 0 || num == null) return "white"
    return color_helper(num)
}

var legend = d3.select("#legend")
    .attr("width", "1000")
    .attr("height", "100")
    .selectAll("g.legend")
    .data(perCapita
        ? [0.00001, 0.0001, 0.001, 0.01, 0.1]
        : [0, 1, 10, 100, 1000, 10000, 100000, 1000000]
    )
    .enter()
    .append("g")
    .attr("class", "legend")

var ls_w = 73, ls_h = 20

function linepos(x) {
    if (x == 0) return 927
    x = Math.log10(x)
    return 854 - x * ls_w
}

legend.append("rect")
    .attr("x", function(d, i){ return 1000 - (i*ls_w) - ls_w})
    .attr("y", 30)
    .attr("width", ls_w)
    .attr("height", ls_h)
    .style("fill", function(d, i) { return color(d) })

labels = perCapita
    ? ["0%", ".001%", ".001%", ".01%", ".1%" ]
    : ["0", "1", "10", "100", "1,000", "10,000", "100,000", "1,000,000"];

legend.append("text")
    .attr("x", function(d, i){ return 1000 - (i*ls_w) - ls_w})
    .attr("y", 70)
    .text(function(d, i){ return labels[i] })

var legend_title = "Number of Coronavirus Cases"

legend.append("text")
    .attr("x", 417)
    .attr("y", 20)
    .text(function(){return legend_title})

g = svg.append("g")

var zoom = d3.zoom()
    .extent([[0, 0], [width, height]])
    .scaleExtent([1, 10])
    .on("zoom", zoomed)


svg.call(zoom)
svg.on("click", unzoomed)

function zoomed() {
    g.attr("transform", d3.event.transform)
}

function unzoomed() {
    svg.transition().duration(1000).call(
        zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
    )
}

var clicked_obj = null

var search = null
var topo = null

function load(us, data) {
    // name list for autocomplete
    topo = topojson.feature(us, us.objects.counties).features
    var names = []
    topo.forEach(function (d) {
        if (data.get(+d.id)) names.push(data.get(+d.id).name.toLowerCase().split(',')[0])
        else names.push("")
    })

    function get_names(needle) {
        needle = needle.toLowerCase()
        results = []
        names.forEach(function (name, idx) {
            if (results.length == 5) return
            if (name.includes(needle)) {
                results.push(idx)
            }
        })
        return results
    }

    // counties and states drawn on svg
    counties = g.selectAll("path")
        .data(topo)
        .enter()
        .append("path")
            .attr("d", path)
            .attr("class", "county")
            .attr("id", function (d) {
                dates.forEach(function (date) {
                    if (!data.get(+d.id)) return
                    if (!(date in data.get(+d.id))) {
                        x = data.get(+d.id)
                        x[date] = {"cases": 0, "deaths": 0}
                        data.set(+d.id, x)
                    }
                })
                return "id-" + +d.id
            })
            .on("click", clicked)

    states = g.append("path")
        .datum(topojson.feature(us, us.objects.states, function(a, b) { return a !== b }))
            .attr("class", "states")
            .attr("d", path)

    new_york = [36081, 36005, 36047, 36085]
    new_york.forEach(d => {
        data.set(d, data.get(36061))
        d3.select("#id-" + d)
            .attr("id", "id-36061")
    })

    // search box
    names = new Map([...names.entries()].sort())
    search = d3.select(".search")
        .append("input")
            .attr("type", "text")
            .attr("class", "form-control")
            .attr("placeholder", "County (or County-Equivalent)")
            .on("keyup", function() {
                var d = this.value
                d3.select(".search").select(".dropdown-menu").remove()
                if (d == "") return
                var add = d3.select(".search")
                    .append("div")
                    .attr("class", "dropdown-menu")
                    .style("display", "inline")
                res = get_names(d)
                res.forEach(function (x) {
                    add.append("a")
                        .attr("class", "dropdown-item")
                        .attr("href", "#")
                        .text(data.get(+topo[x].id).name)
                        .on("click", function () {
                            clicked(topo[x])
                        })
                })
            })

    var slider = d3.select(".slider")
        .append("input")
            .attr("class", "custom-range")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", dates.length - 1)
            .attr("step", 1)
            .on("input", function() {
                update(slider.property('value'), interval.property('value'))
            })

    var interval = d3.select(".slider-interval")
        .append("input")
            .attr("class", "custom-range")
            .attr("type", "range")
            .attr("min", 0)
            .attr("max", 14)
            .property('value', 14)
            .attr("step", 1)
            .on("input", function() {
                update(slider.property('value'), interval.property('value'))
            })
    
    var first_button = d3.select(".first-scene")
            .append("input")
            .on("input", function() {
                update(slider.property('150'), interval.property('10'))
            })


    function clicked(d) {
        if (data.get(+d.id).id == clicked_obj) {
            unzoomed()
            clicked_obj = null
            counties.style("opacity", "1")
            infobar.transition()
                .duration(250)
                .style("opacity", 0)
            return
        }
        infobar.selectAll("*").remove();
        infobar.transition()
            .duration(250)
            .style("opacity", 1)

        clicked_obj = data.get(+d.id).id

        counties.style("opacity", 0.5)
        d3.selectAll("#id-" + data.get(+d.id).id)
            .style("opacity", "1")

        const [[x0, y0], [x1, y1]] = path.bounds(d)
        d3.event.stopPropagation()
        svg.transition().duration(1000).call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(10, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
            d3.mouse(svg.node())
        )

        update(slider.property("value", interval.property('value')))
    }

    // Return the number of cases or deaths between a range of days
    function getData(item, key, property, interval, perCapita) {
        const startDate = dates[key - interval];
        const endDate = dates[key];

        if (item && endDate in item) {
            var start = (item[startDate] || {})[property] || 0;
            var end = (item[endDate] || {})[property] || 0;

            if (perCapita) {
                const population = item.population || Infinity;
                start = start / population;
                end = end / population;
            }

            const total = end && start ? end - start : end;
            return Math.abs(total);
        }
    }

    function getDateforText(date_key) {
        if (date_key < 5) {
            return "CDC Confirms First US Coronavirus Case"
        } else if(date_key >= 5 && date_key < 34) {
             return "US Declares Public Health Emergency"
        }
        else if(date_key >= 35 && date_key < 49) {
            return "CDC Says COVID-19 Is Heading Toward Pandemic Status"
       }
       else if(date_key >= 50 && date_key < 51) {
        return "WHO Declares COVID-19 a Pandemic"
        }
        else if(date_key >= 52 && date_key < 65) {
            return "Trump Declares COVID-19 a National Emergency and Travel Ban on Non-US Citizens Traveling From Europe Goes Into Effect["
        }
        else if(date_key >= 66 && date_key < 127) {
            return "Trump Signs CARES Act Into Law"
        }
        else if(date_key >= 128 && date_key < 140) {
            return "US COVID-19 Deaths Pass the 100,000 Mark"
        }
        else if(date_key >= 141 && date_key < 156) {
            return "US COVID-19 Cases Reach 2 Million"
        }
        else if(date_key >= 157 && date_key < 167) {
            return "White House Coronavirus Task Force Addresses Rising Cases in the South"
        }
        else if(date_key >= 168 && date_key < 187) {
            return "US Surpasses 3 Million Infections, Begins WHO Withdrawal"
        }   
        else if(date_key >= 188 && date_key < 208) {
            return "Moderna Vaccine Begins Phase 3 Trial, Receives $472M From Trump Administration"
        }
        else if(date_key >= 209 && date_key < 245) {
            return "COVID-19 Now the Third-Leading Cause of Death in the US"
        }   
        else if(date_key >= 246 && date_key < 260) {
            return "A New, More Contagious Strain of COVID-19 Is Discovered"
        }                    
        else if(date_key >= 261 && date_key < 287) {
            return "NEJM Criticizes Trump’s COVID-19 Response; 39 States See Case Spikes"
        }     
        else if(date_key >= 288 && date_key < 344) {
            return "US Reports Unprecedented 100,000 Cases in 1 Day"
        }    
        else if(date_key >= 345 && date_key < 371) {
            return "US Falls Short of Goal to Give 20 Million Vaccinations by Year End"
        }    
        else if(date_key >= 372 && date_key < 376) {
            return "US Vaccine Supply to Increase by 50%"
        }   
        else if(date_key >= 377 && date_key < 387) {
            return "More Americans Vaccinated Than Infected With COVID-19"
        }     
        else if(date_key >= 388 && date_key < 401) {
            return "United States Purchases 200 Million Moderna, Pfizer Vaccines"
        }  
        else if(date_key >= 402 && date_key < 418) {
            return "Vaccine Acceptance Among Americans Increases and 50 Million COVID-19 Vaccine Doses Administered"
        } 
        else if(date_key >= 419 && date_key < 422) {
            return "White House to Spend $1.5 Billion on Vaccine Confidence Campaign"
        } 
        else if(date_key >= 423 && date_key < 422) {
            return "United States Administers 100 Millionth Vaccine"
        } 
        else if(date_key >= 423 && date_key < 436) {
            return "Vaccine Hesitancy Drops"
        } 
        else if(date_key >= 437 && date_key < 442) {
            return "CDC Expands Travel Guidelines"
        } 
        else if(date_key >= 443 && date_key < 518) {
            return "UK Variant Now Dominant in United States"
        } 
        else if(date_key >= 519) {
            return "Delta Variant Concerns Mount"
        } 
    }

    function update(key, interval){
        infobar.selectAll("*").remove();
        slider.property("value", key)
        d3.select(".date")
            .text(dates[key])
        d3.select(".date-text")
        .text(getDateforText(key))
        d3.select(".interval")
            .text(interval && interval !== '14' ? `Last ${interval} days` : 'Last 14 days')
        counties.style("fill", function(d) {
                const item = data.get(+d.id);
                return color(getData(item, key, 'cases', interval, perCapita))
            })
            .on("mouseover", function(d) {
                var obj = d3.selectAll("#id-" + data.get(+d.id).id)
                var item = data.get(+d.id);
                var cases = getData(item, key, 'cases', interval, false);
                var deaths = getData(item, key, 'deaths', interval, false);

                if (clicked_obj) obj.style("opacity", 1)
                else obj.style("opacity", 0.2)

                tooltip.transition()
                    .duration(250)
                    .style("opacity", 1)
                tooltip.html(
                    "<p><strong>" + data.get(+d.id).name + "</strong><br>" +
                        cases.toLocaleString() + " confirmed case" +
                        (cases == 1 ? "" : "s") + "<br>" + deaths.toLocaleString() + " death" + (deaths == 1 ? "" : "s") +
                        "</p>")
                    .style("left", (d3.event.pageX + 15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            })
            .on("mousemove", function (d) {
                tooltip
                    .style("left", (d3.event.pageX + 15) + "px")
                    .style("top", (d3.event.pageY - 28) + "px")
            })
            .on("mouseout", function (d) {
                var obj = d3.selectAll("#id-" + data.get(+d.id).id)
                if (clicked_obj != data.get(+d.id).id) {
                    if (clicked_obj) obj.transition()
                        .duration(150)
                        .style("opacity", 0.5)
                    else obj.transition()
                        .duration(150)
                        .style("opacity", 1)
                }

                tooltip.transition()
                    .duration(250)
                    .style("opacity", 0)
            })

        if (clicked_obj == null) return

        d = {"id": clicked_obj}

        var cases = data.get(+d.id)[dates[key]].cases
        var deaths = data.get(+d.id)[dates[key]].deaths

        infobar.append("h3").text(data.get(+d.id).name)
        infobar.append("p").text(cases.toLocaleString() + " confirmed case" + (cases == 1 ? "" : "s"))
        infobar.append("p").text(deaths.toLocaleString() + " death" + (deaths == 1 ? "" : "s"))
        infobar.append("p").text(data.get(+d.id).population.toLocaleString() + " people")

        var line = infobar.append("svg")
            .attr("height", graph_height + 50)
            .attr("width", graph_width + 50)
            .append("g")
            .attr("transform", "translate(40, 10)")

        dat = []
        dat_deaths = []
        start = dates.length
        for (var id = 0; id < dates.length; id++) {
            if (data.get(+d.id)[dates[id]].cases > 0) {
                if (start == dates.length) {
                    dat.push({"x": id - 1, "y": 0})
                    dat_deaths.push({"x": id - 1, "y": 0})
                    start = id
                }
            }
            if (start != dates.length) {
                dat.push({"x": id, "y": data.get(+d.id)[dates[id]].cases})
                dat_deaths.push({"x": id, "y": data.get(+d.id)[dates[id]].deaths})
            }
        }

        var x = d3.scaleLinear()
            .domain([start - 1, dates.length - 1])
            .range([0, graph_width])

        line.append("g")
            .attr("transform", "translate(0, " + graph_height + ")")
            .call(d3.axisBottom(x).tickFormat((d, i) => dates[d]))
            .selectAll(".tick text")
            .style("text-anchor", "end")
            .attr("transform", "rotate(-45) translate(-3, 0)")

        var y = d3.scaleLinear()
            .domain([0, d3.max(dat, function(d) {
                return parseInt(d.y)
            })])
            .range([graph_height, 0])

        line.append("g")
            .call(d3.axisLeft(y))
            .attr("transform", "translate(0, 0)")

        line.append("path")
            .datum(dat)
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(a) { return x(a.x) })
                .y(function(a) { return y(a.y) })
            )

        line.append("path")
            .datum(dat_deaths)
            .attr("fill", "none")
            .attr("stroke", "red")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function(a) { return x(a.x) })
                .y(function(a) { return y(a.y) })
            )

        if (key - start >= -1) {
            line.append("circle")
                .attr("cx", x(key))
                .attr("cy", y(dat[key - start + 1].y))
                .attr("r", 4)
                .style("fill", "steelblue")
            line.append("circle")
                .attr("cx", x(key))
                .attr("cy", y(dat_deaths[key - start + 1].y))
                .attr("r", 4)
                .style("fill", "red")
        }
    }

    update(dates.length - 1, interval.property('value'))
}


var data = new Map()

d3.json("data/counties-10m.json").then(function(us) {
    d3.csv("data/lookup.csv", function (d) {
        return [+d.FIPS, {"population": +d.Population, "name": d.Admin2 + ", " + d.Province_State}]
    }).then(function(pop) {
        pop = new Map(pop)
        d3.csv("https://raw.githubusercontent.com/nytimes/covid-19-data/master/us-counties.csv", function(d) {
            if (d.county === "New York City") d.fips = 36061
            if (!dates.includes(d.date)) {
                dates.push(d.date)
            }
            if (data.get(+d.fips)) {
                x = data.get(+d.fips)
                x[d.date] = {"cases": +d.cases, "deaths": +d.deaths}
                data.set(+d.fips, x)
            }
            else {
                x = {}
                x[d.date] = {"cases": +d.cases, "deaths": +d.deaths}
                x["name"] = (pop.get(+d.fips) || {}).name || 'No name'
                x["id"] = +d.fips
                x["population"] = (pop.get(+d.fips) || {}).population || 'Unknown population'
                data.set(+d.fips, x)
            }
        }).then(function (d) {
            pop.forEach(function (value, key) {
                if (!data.get(key)) {
                    data.set(key, {"name": value.name, "population": value.population, "id": key})
                }
            })
            load(us, data)
        })
    })
})