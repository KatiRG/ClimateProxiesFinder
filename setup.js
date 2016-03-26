
//====================================================================
var map;
var mapMaxZoom = 6;

var markers = [] ;
var markerGroup ;

var grat;

var xf;
var depthDim;
var depthGroup;
var ageDim;
var ageGroup;
var archiveDim;
var archiveGroup;
var materialDim;
var materialGroup;

var  Ice_color = "#008cb2";
var  Lake_color = "#314f6f";
var  Ocean_color = "#81a6d3";
var  Speleothem_color = "#afa393";
var  Tree_color = "#568e14";
var  Carbonate_color = "#ff0000";
var  NonCarbonate_color = "#903373";
var  Cellulose_color = Tree_color;
var  Coral_color = "#ff7f50";
var  PlanktonicForaminifera_color = Ocean_color;
var  BenthicForaminifera_color = Ocean_color;
var  Unkown_color = "#FF4400";
var  Others_color = "#FF4400";

myIcon = L.icon({
    iconUrl: 'LSCE_Icon.png',
    iconSize: [20, 20], 
    iconAnchor: [10, 0] 
});

//====================================================================
function init() {

//-----------------------------------------
d3.tsv("proxies_select.tsv", function(data) {
//d3.tsv("proxies.tsv", function(data) {
  data.forEach(function(d) {
        d.Longitude = +d.Longitude;
        d.Latitude = +d.Latitude;
        d.Depth = +d.Depth;
        d.OldestDate = +d.OldestDate;
        d.RecentDate = +d.RecentDate;

	// Limit latitudes according to latitude map range (-85:85)
        if (d.Latitude < -85) d.Latitude = -85;
        if (d.Latitude > 85) d.Latitude = 85;
  });

  initCrossfilter(data);

  // Render the total.
  d3.selectAll("#total").text(xf.size());

//-----------------------------------------
});

}



//====================================================================
function initCrossfilter(data) {

  //-----------------------------------
  xf = crossfilter(data);

  //-----------------------------------
  depthRange = [0., 5000.];
  depthBinWidth = 100.;
  depthDim = xf.dimension( function(d) { 
	// Threshold
	var depthThresholded = d.Depth;
	if (depthThresholded <= depthRange[0]) depthThresholded = depthRange[0];
	if (depthThresholded >= depthRange[1]) depthThresholded = depthRange[1] - depthBinWidth;
	return depthBinWidth*Math.floor(depthThresholded/depthBinWidth);
      });
  depthGroup = depthDim.group();

  //-----------------------------------
  age1Range = [-2.5, 50.];
  age2Range = [-2.5, 50.];
  ageBinWidth = 1.;
  ageDim = xf.dimension( function(d) {
	// Threshold
	var age1Thresholded = d.RecentDate;
	if (age1Thresholded <= age1Range[0]) age1Thresholded = age1Range[0];
	if (age1Thresholded >= age1Range[1]) age1Thresholded = age1Range[1] - ageBinWidth;
	var age1 = ageBinWidth*Math.floor(age1Thresholded/ageBinWidth);
	var age2Thresholded = d.OldestDate;
	if (age2Thresholded <= age2Range[0]) age2Thresholded = age2Range[0];
	if (age2Thresholded >= age2Range[1]) age2Thresholded = age2Range[1] - ageBinWidth;
	var age2 = ageBinWidth*Math.floor(age2Thresholded/ageBinWidth);
        return [age2, age1, d.Archive];
      });
  ageGroup = ageDim.group();

  //-----------------------------------
  archiveDim = xf.dimension( function(d) { return d.Archive; });
  archiveGroup = archiveDim.group();

  //-----------------------------------
  materialDim = xf.dimension( function(d) { return d.Material; });
  materialGroup = materialDim.group();

  //-----------------------------------
  mapDim = xf.dimension(function(d) { return [d.Latitude, d.Longitude]; });
  mapGroup = mapDim.group();

  //-----------------------------------
  mapChart  = dc.leafletMarkerChart("#chart-map");

  mapChart
      .width(1000)
      .height(300)
      .dimension(mapDim)
      .group(mapGroup)
      .center([0,0])
      .mapOptions({maxZoom: mapMaxZoom})
      .zoom(1)
      .filterByArea(true)
      .cluster(true) 
      .clusterOptions({maxClusterRadius: 50, showCoverageOnHover: false, spiderfyOnMaxZoom: true})
      .icon(function(d,map) {
		return myIcon;
       })
      .popup(function(d,marker) {
		console.log(data[10]);
		console.log(marker);
		return  "Id: " + "<b>" + d.Id + "</b></br>";
		//+ "Position: " + "<b>" + d.Longitude.toFixed(2) + "°E</b>, <b>" + d.Latitude.toFixed(2) + "°N</b></br>"
		//+ "Depth (m): " + "<span style='color: " + Ocean_color + ";'><b>" +  d.Depth.toFixed(2) + "</b></span></br>"
		//+ "Date (ka): " + "<span style='color: #C9840B;'>" + "from <b>" + d.RecentDate.toFixed(2) + "</b> to <b>" + d.OldestDate.toFixed(2) + "</b></span></br>"
		//+ "Archive: " + "<b>" + d.Archive + "</b></br>"
		//+ "Material: " + "<b>" + d.Material + "</b></br>";
       });  

  //-----------------------------------
  depthChart  = dc.barChart("#chart-depth");

  depthChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 40})	
    .centerBar(false)
    .elasticY(true)
    .dimension(depthDim)
    .group(depthGroup)
    //.on("preRedraw", update0)
    .x(d3.scale.linear().domain(depthRange))
    .xUnits(dc.units.fp.precision(depthBinWidth))
    .round(function(d) {return depthBinWidth*Math.floor(d/depthBinWidth)})
    .gap(0)
    .renderHorizontalGridLines(true)
    .colors(Ocean_color);

  xAxis_depthChart = depthChart.xAxis();
  xAxis_depthChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_depthChart = depthChart.yAxis();
  yAxis_depthChart.tickFormat(d3.format("d")).tickSubdivide(0);

  //-----------------------------------
  var archiveColors = d3.scale.ordinal()
        .domain(["Ice", "Lake", "Ocean", "Speleothem", "Tree"])
   	.range([Ice_color, Lake_color, Ocean_color, Speleothem_color, Tree_color]);

  ageChart  = dc.scatterPlot("#chart-age");

  ageChart
    .width(380)
    .height(200)
    .margins({top: 10, right: 20, bottom: 30, left: 40})	
    .dimension(ageDim)
    .group(ageGroup)
    .xAxisLabel("Most recent age")
    .yAxisLabel("Oldest age")
    //.on("preRedraw", update0)
    //.mouseZoomable(true)
    .x(d3.scale.linear().domain(age1Range))
    .y(d3.scale.linear().domain(age2Range))
    .round(function(d) {return ageBinWidth*Math.floor(d/ageBinWidth)})
    .renderHorizontalGridLines(true)
    .renderVerticalGridLines(true)
    .symbolSize(8)
    .highlightedSize(8)
    .existenceAccessor(function(d) { return d.value > 0 ; })
    .colorAccessor(function (d) { return d.key[2]; })
    .colors(archiveColors)
    .filterHandler(function(dim, filters) {
  	if(!filters || !filters.length)
    		dim.filter(null);
    	else {
      	// assume it's one RangedTwoDimensionalFilter
    	dim.filterFunction(function(d) {
      		return filters[0].isFiltered([d[0],d[1]]);
      		})
    	}
    });
    // https://jsfiddle.net/gordonwoodhull/c593ehh7/5/
    // .colors("#ff0000");

  xAxis_ageChart = ageChart.xAxis();
  xAxis_ageChart.ticks(6).tickFormat(d3.format("d"));
  yAxis_ageChart = ageChart.yAxis();
  yAxis_ageChart.ticks(6).tickFormat(d3.format("d"));

  //-----------------------------------
  archiveChart  = dc.rowChart("#chart-archive");

  archiveChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(archiveDim)
    .group(archiveGroup)
    //.on("preRedraw", update0)
    .colors(archiveColors)
    .elasticX(true)
    .gap(2)
    .xAxis().ticks(4);

  //-----------------------------------
  var newOrderMaterial = {
		      "Carbonate": 1, 
		      "Non-Carbonate": 2,
		      "Cellulose": 3,
		      "Coral": 4,
		      "Benthic foraminifera": 5,
		      "Planktonic foraminifera": 6,
		      "Ice": 7,
		      "Speleothem": 8,
                      "Others": 9, 
                      "Unknown": 10 };
  var materialColors = d3.scale.ordinal()
        .domain(["Carbonate", "Non-Carbonate", "Cellulose", "Coral", "Benthic foraminifera",
		 "Planktonic foraminifera", "Ice", "Speleothem", "Others", "Unknown" ])
   	.range([Carbonate_color, NonCarbonate_color, Cellulose_color, Coral_color, BenthicForaminifera_color,
		PlanktonicForaminifera_color, Ice_color, Speleothem_color, Others_color, Unkown_color]);

  materialChart  = dc.rowChart("#chart-material");

  materialChart
    .width(180)
    .height(200)
    .margins({top: 10, right: 10, bottom: 30, left: 10})	
    .dimension(materialDim)
    .group(materialGroup)
    //.on("preRedraw", update0)
    .colors(materialColors) 
    .elasticX(true)
    .gap(2)
    .ordering(function (d) { return newOrderMaterial[d.key]; })
    .xAxis().ticks(4);

  //-----------------------------------
  dc.renderAll();

}



//====================================================================
