/* GLOBAL FUNCTIONS */

//Fetches feed through a *SYNCHRONOUS* AJAX request, based on subreddit name (string), post count (number), and which ID was last or first fetched (string).
function fetchFeed(subreddit, count, after, before) {
    //Ensures the parameters have values
    if (subreddit != null && count != null && count <= linkLimit) {

        //If no starting point is specified, set "after" and "before" to be empty strings.
        if (after == null) after = "";
        if (before == null) before = "";

        //Initialize output object.
        var output = {};

        //Fetch the JSON.
        $.ajax({
            url: "https://www.reddit.com/r/" + subreddit + ".json",
            async: false,
            data: {
                limit: count,
                after: after,
                before: before
            },
            success: function (data) {
                output = data;
            }
        });
        RawFeed = output;
        return output;
    } else
        console.error("Invalid Parameters");
}

//Parses the raw, fetched Reddit JSON into a more managable JSON syntax.
function parseFeed(rawFeed) {
    //Initialize the returnable array of posts.
    var returnable = [];

    //Iterate through the fetched links with a jQuery forEach loop.
    $.each(rawFeed.data.children, function (i, e) {
        //Easy accessor.
        var ctx = e.data;

        //Make sure the post isn't a sticked post. We're not interested in stickied posts, and they aren't affected by the limit count.
        if (ctx.stickied)
            return true;

        //Initialize a post object.
        var post = new redditPost();

        //Detemine the type of post.
        ctx.is_self ? post.type = 0 : post.type = 1;

        //Assign the object some values.
        post.title = ctx.title;
        post.author = ctx.author;
        post.comments = ctx.num_comments;
        if (ctx.is_self)
            post.content = SnuOwnd.getParser().render(ctx.selftext);
        else
            post.content = ctx.url;
        post.createdDate = new Date(ctx.created * 1000).toDateString();
        post.score = ctx.score;
        post.thumbnail = ctx.thumbnail;
        post.url = "http://www.reddit.com" + ctx.permalink;
        post.id = ctx.name;

        //Push the object to the return array.
        returnable.push(post);
    });

    //Return the finished array
    ParsedFeed = returnable;
    return returnable;
}

//Button event
function newFetch() {
    //Empty the list of links
    $("#postList").empty();

    //Check if we're fetching data from a new subreddit.
    if ($(".redditName").val().toLowerCase() != reddit) {
        reddit = $(".redditName").val().toLowerCase();
    }

    //Repopulate the list
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val())));
}

//Populates the div with readable elements.
function populateList(parsedFeed) {
    //Make sure we actually got any posts back.
    if (parsedFeed[0] != null) {
        //Assign the marker variables the first and last ID's of the list of links.
        beforeID = parsedFeed[0].id;
        afterID = parsedFeed[parsedFeed.length - 1].id;

        //For each post in the parsed array...
        $.each(parsedFeed, function (i, e) {
            //Clone the HTML template
            var post = $(".postTemplate").clone();

            //Remove the template attributes.
            post.attr("style", "");
            post.attr("class", "postLink");

            //Fill the element with values.
            post.find(".thumbnail").attr("src", e.thumbnail);
            post.find(".title").html(e.title);
            post.find(".author").html("by: " + e.author);
            post.find(".score").html(e.score + " points");
            post.find(".comments").html(e.comments + " comments");
            post.find(".date").html(e.createdDate);
            post.find(".commentLink").attr("href", e.url);
            post.find(".inspectLink").click(function (i) {
                inspectLink(post.clone(), e);
            });
            //Determine if the thumbnail should be clickable to reach the source
            if (e.type == 1)
                post.find(".contentLink").attr("href", e.content);
            else
                post.find(".thumbnail").attr("src", "self.png");

            //Append the new element to the post list.
            post.appendTo("#postList");
        });
    } else {
        alert("No more posts!");
    }

}

//Page Control
function previousPage() {
    $("#postList").empty();
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val(), null, beforeID)));
}

function nextPage() {
    $("#postList").empty();
    populateList(parseFeed(fetchFeed(reddit, $(".numberPosts").val(), afterID, null)));
}

//Inspect Post
function inspectLink(element, postObject) {
    //Move the viewport
    $("body").css("margin-left", "-100vw");
    //clone the postlink to append it to the postreader
    $("#postReader").find(".postLink").replaceWith($(element));

    //If it's a self post (text or link)
    if (postObject.type == 0){
        $("#postReader").find("p").replaceWith(postObject.content);
        $("#postReader").find(".preview").css("display", "none");
    }

    //else
    else{
        $("#postReader").find(".preview").css("display", "block");
        $("#postReader").find("img").attr("src", postObject.content);
        $("#postReader").find("p").css("display", "none");
    }

    //Fetch comments
    var fetchedComments = fetchComments(postObject, 0);

    //Update global variables
    RawComments = fetchedComments.raw;
    ParsedComments = fetchedComments.parsed;
    
    //Create a DOM element for every parsed comment and append them to the reader.
    $.each(fetchedComments.parsed, function (i, e) { 
        var comment = $(".commentTemplate").clone();
        comment.attr("style", "");
        comment.attr("class", "postComment");
        comment.find(".author").html(e.author);
        comment.find(".score").html(e.score + " points");
        //Click handler for fetching children of a comment
        comment.find(".expand").click(function(){
            expandChildren(comment, e);
        })
        comment.find(".content").replaceWith(e.content);
        comment.appendTo("#postReader .commentSection");
    });


}

//De-inspect Post
function back(){
    $("body").css("margin-left", "0");
    $("#postReader .commentSection").empty();
}

//Fetch Comments
function fetchComments(postObject, index) {
    var output = [];
    var parsed = [];
    //Fetch the JSON.
    $.ajax({
        url: postObject.url + ".json",
        async: false,
        success: function (data) {
            output = data;
        }
    });

    //Parse the fetched JSON to a simplyfied state on demand, 10 at a time.
    for(var i = index; i < index + 10; i++){
        if(output[1].data.children[i] != null){
            var e = output[1].data.children[i];
            var x = new redditComment();
            if(e.data.replies.data != null)
                x.rawChildren = e.data.replies.data.children;
            x.content = SnuOwnd.getParser().render(e.data.body);
            x.author = e.data.author;
            x.score = e.data.score;
            parsed.push(x);
        }
        else
            break;
    }
    return {
        parsed: parsed,
        raw: output
    }
        
}

//Function to parse, style and append replies to a comment element.
function expandChildren(parentCommentElement, parentCommentObject){
    //Array for parsed children
    var parsed = [];

    //If we haven't parsed the comment's children yet, let's do that.
    if(!parentCommentElement.hasClass("parsed")){

        //Go through the raw JSON replies of the comment
        $.each(parentCommentObject.rawChildren, function (i, e) {
    
            //Create a redditComment object for simplified access
            var comment = new redditComment();
            if(e.data.replies.data != null)
                comment.rawChildren = e.data.replies.data.children;
            comment.content = SnuOwnd.getParser().render(e.data.body);
            comment.author = e.data.author;
            comment.score = e.data.score;

            //Push it to the parsed children array
            parsed.push(comment);
    
            //Create the html element and populate it with content
            var child = $(".commentTemplate").clone();
            child.find(".children").empty();
            child.attr("style", "");
            child.attr("class", "postComment");
            child.find(".author").html(comment.author);
            child.find(".score").html(comment.score + " points");
            //Set up a click handler to append the children of a child.
            child.find(".expand").click(function(){
                expandChildren(child, comment);
            });
            child.find(".content").html(comment.content);

            //Append it to the parent's children container
            child.appendTo(parentCommentElement.find(".children"));
        });
        //Ensure we don't parse comments more than once.
        parentCommentElement.addClass("parsed");
        //Add the expanded class to keep track of the status of the comment
        parentCommentElement.toggleClass("expanded");
        //Set the parent's children array to the parsed array we created.
        parentCommentObject.children = parsed;
    }

    //If we've already parsed the raw JSON, we just display none or display block depending on if we want to show it or not.
    else{
        if(parentCommentElement.hasClass("expanded")){
            parentCommentElement.find(".children").css("display", "none");
            parentCommentElement.removeClass("expanded");

        }
        else{
            parentCommentElement.find(".children").css("display", "block");
            parentCommentElement.addClass("expanded");
        }
    }
}

/* EOS */

/* OBJECT CONSTRUCTORS */

function redditPost() {
    this.title = "";
    //Key to easily determine if the post is an image or a selfpost (0 = self, 1 = link)
    this.type = 0;
    this.content = null;
    this.createdDate = "";
    this.author = "";
    this.score = 0;
    this.comments = 0;
    this.url = "";
    this.thumbnail = "";
    this.id = "";
}

function redditComment(){
    this.content = "";
    this.author = "";
    this.score = 0;
    this.index = 0;
    this.children = [];
    this.rawChildren = {};
}

/* EOS */

/* GLOBAL VARIABLES */

//Hard limit for amount of links that can be fetched, to prevent overloading.
const linkLimit = 100;

//Current Subreddit
var reddit = "";

//Keep track of the ID of the first, and last post to be fetched.
var beforeID = "";
var afterID = "";

//Variable for containing the most recent, raw JSON feed.
var RawFeed = {};

//Variable for containing the most recent, parsed JSON feed.
var ParsedFeed = [];

//Variable for containing the raw JSON comment feed for the currently inspected post.
var RawComments = {};

//Variable for containing the parsed JSON comment feed for the currently inspected post.
var ParsedComments = [];